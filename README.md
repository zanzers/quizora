# Quizora — AI Document Q&A / Quiz Generator

A RAG (Retrieval-Augmented Generation) app: upload documents (`.md`, `.pdf`),
ask questions or generate quizzes grounded in that content, with source
citations.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend framework | Next.js (App Router, TypeScript) |
| Styling | Tailwind CSS |
| LLM (generation) | Groq — `openai/gpt-oss-120b` |
| Embeddings | Cohere — `embed-v4.0` (1024 dimensions) |
| Vector database | Pinecone (serverless, free Starter tier) |
| Relational database | Postgres via Neon (serverless, free tier) |
| ORM | Drizzle |
| Tokenizer (for chunking) | `gpt-tokenizer` |
| PDF text extraction | `pdf-parse` v2 |

## Services used — sign up / dashboard links

| Service | Used for | Link | Free tier notes |
|---|---|---|---|
| Groq | LLM text generation | https://console.groq.com | No card required. Rate-limited (~30 req/min on free tier) — see [docs](https://console.groq.com/docs/rate-limits) |
| Pinecone | Vector storage + similarity search | https://app.pinecone.io | Free "Starter" plan: 1 serverless index, ~2GB storage, no card required |
| Cohere | Text embeddings | https://dashboard.cohere.com | Trial key: 1,000 free API calls/month, no card required |
| Neon | Postgres — stores quizzes for shareable code lookup | https://neon.com | Free tier: 0.5GB storage, 100 compute-hours/month, no card required, doesn't expire |

## Environment variables

Create `.env.local` in the project root:

```
GROQ_API_KEY=your_key_here
PINECONE_API_KEY=your_key_here
COHERE_API_KEY=your_key_here
DATABASE_URL=your_neon_connection_string_here
```

Never commit this file or paste these values anywhere outside it — `.env.local`
is already covered by Next.js's default `.gitignore`.

## Pinecone index setup

Create an index in the Pinecone dashboard with:
- **Name:** `quizora` (must match the string used in code: `pinecone.index("quizora")`)
- **Dimensions:** `1024` (must match Cohere's `outputDimension` setting — these two numbers have to agree or upserts will fail)
- **Metric:** `cosine`

## Postgres schema

`src/db/schema.ts` defines a `quizzes` table, keyed by a human-readable
slug code (e.g. `database-sharding-3f2a`) instead of an auto-incrementing ID —
this is what makes a quiz shareable/re-openable via URL:

```ts
export const quizzes = pgTable("quizzes", {
  code: text("code").primaryKey(),
  topic: text("topic").notNull(),
  questions: jsonb("questions").notNull(),
  sources: jsonb("sources").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

## Local setup

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Project structure (routes built so far)

```
src/
  app/
    layout.tsx              # root layout, imports global.css
    global.css               # @import "tailwindcss";
    page.tsx                  # home page
    generate/
      page.tsx                 # quiz generation form — saves result to
                                 # sessionStorage, redirects to /quiz
    quiz/
      page.tsx                  # question cards — MCQ + fill-in-blank,
                                  # progress bar, saves answers, redirects to /score
    score/
      page.tsx                   # score screen — MCQ graded instantly (client-side
                                   # comparison), fill-in-blank graded via /api/grade,
                                   # shows missed questions + sources
    api/
      test/
        route.ts                  # POST — retrieves relevant chunks from Pinecone
                                    # (0.4 similarity threshold), generates mixed
                                    # MCQ/fill-in-blank quiz grounded in that context,
                                    # 404s with a clear message if nothing relevant found
      upload/
        route.ts                  # POST — accepts .md/.txt/.pdf, extracts text
                                    # (pdf-parse v2 for PDFs), chunks (600 tokens,
                                    # 100 overlap), embeds (Cohere), upserts into Pinecone
      grade/
        route.ts                  # POST — batches fill-in-blank answers, asks the LLM
                                    # to judge semantic correctness (not exact string match)
      embed-test/
        route.ts                  # GET  — scaffolding-only, safe to delete
      retrieve-test/
        route.ts                  # POST — scaffolding-only, safe to delete
  db/
    schema.ts                 # Drizzle schema — quizzes table, keyed by slug code
```

## How the RAG pipeline works (what each route does)

**Ingestion** (`/api/upload`):
```
file upload (.md/.txt/.pdf) → extract text → chunk (600 tokens, 100 overlap)
→ embed each chunk (Cohere, inputType: search_document)
→ upsert into Pinecone with metadata (filename, documentId, chunkIndex)
```

**Generation, grounded in retrieval** (`/api/test`):
```
{ topic, count }
→ embed topic (Cohere, inputType: search_query)
→ query Pinecone (topK: 4), filter matches below 0.4 similarity
→ if nothing relevant: 404 "couldn't find relevant content"
→ else: prompt Groq (system prompt forbids outside knowledge) with
  retrieved chunks as context, response_format: json_object
→ parse { questions: [...] }, attach deduplicated { sources: [...] }
```

**Answer grading** (client-side + `/api/grade`):
```
MCQ  → compared instantly in the browser, zero API calls
Fill-in-blank → batched into one call to /api/grade, LLM judges
                semantic correctness (allows different phrasing)
```

## Phase 1 — RAG fundamentals: ✅ done

- [x] Document upload (.md/.txt/.pdf) with text extraction
- [x] Chunking (600 tokens, 100 overlap)
- [x] Embeddings (Cohere) + vector storage (Pinecone)
- [x] Retrieval with similarity threshold (0.4 cutoff) + graceful "not found"
- [x] Grounded quiz generation (LLM restricted to retrieved context only)
- [x] Full quiz UI: generate → question cards (MCQ + fill-in-blank) → score
- [x] Correct grading for both types (instant client-side for MCQ, LLM
      semantic grading for fill-in-blank)

## Phase 2 — in progress

- [ ] **Shareable quiz codes** — Postgres (Neon) table keyed by a slug
      (e.g. `database-sharding-3f2a`), so a quiz can be opened via
      `/quiz/[code]` instead of living only in one browser's `sessionStorage`
- [ ] MD/PDF export of a generated quiz
- [ ] Request queue + exponential backoff for LLM/embedding calls, for
      when multiple users hit the app concurrently
- [ ] Visual/design polish (currently plain Tailwind defaults)

## Phase 3 — later

- [ ] User accounts / quiz history across sessions
- [ ] Caching identical fill-in-blank answers to cut down on `/api/grade` calls
- [ ] OCR support for scanned (image-only) PDFs — currently unsupported,
      `pdf-parse` returns an empty-text error for these

## Notes for future me

- Cohere's `embed-v4.0` needs `inputType` set correctly: `search_document`
  when embedding content to store, `search_query` when embedding a question
  to search with. Same model, different vector shaping — getting this
  backwards silently degrades match quality rather than erroring.
- Pinecone's SDK expects `index.upsert({ records: [...] })` — passing a raw
  array (older SDK versions' syntax) throws a type error.
- Groq deprecates model names periodically — if a `model_not_found` error
  shows up, check https://console.groq.com/docs/models for the current list.
- `pdf-parse` v2 is a full rewrite from v1: it's a class now
  (`new PDFParse({ data: buffer }).getText()`), not a callable default export.
  It also needs `serverExternalPackages: ["pdf-parse"]` in `next.config.mjs` —
  without it, Next's bundler breaks pdf.js's worker file resolution
  ("Setting up fake worker failed").
- Cohere's `outputDimension` and the Pinecone index's configured dimension
  must match exactly (this project uses 1024) — mismatches fail on upsert,
  and Pinecone index dimensions can't be changed after creation.
- Postman gotcha, hit more than once: a leftover manual `Content-Type` header
  overrides the one Postman auto-generates for `form-data` uploads, causing
  a "Content-Type was not multipart/form-data" error. Delete manual
  Content-Type headers when using the form-data body type.