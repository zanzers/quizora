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
| Tokenizer (for chunking) | `gpt-tokenizer` |

## Services used — sign up / dashboard links

| Service | Used for | Link | Free tier notes |
|---|---|---|---|
| Groq | LLM text generation | https://console.groq.com | No card required. Rate-limited (~30 req/min on free tier) — see [docs](https://console.groq.com/docs/rate-limits) |
| Pinecone | Vector storage + similarity search | https://app.pinecone.io | Free "Starter" plan: 1 serverless index, ~2GB storage, no card required |
| Cohere | Text embeddings | https://dashboard.cohere.com | Trial key: 1,000 free API calls/month, no card required |

## Environment variables

Create `.env.local` in the project root:

```
GROQ_API_KEY=your_key_here
PINECONE_API_KEY=your_key_here
COHERE_API_KEY=your_key_here
```

Never commit this file or paste these values anywhere outside it — `.env.local`
is already covered by Next.js's default `.gitignore`.

## Pinecone index setup

Create an index in the Pinecone dashboard with:
- **Name:** `quizora` (must match the string used in code: `pinecone.index("quizora")`)
- **Dimensions:** `1024` (must match Cohere's `outputDimension` setting — these two numbers have to agree or upserts will fail)
- **Metric:** `cosine`

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
      page.tsx                 # quiz generation form (calls /api/test)
    quiz/
      page.tsx                  # placeholder — question card UI (not yet built)
    score/
      page.tsx                   # placeholder — score screen (not yet built)
    api/
      test/
        route.ts                  # POST — generates mixed MCQ / fill-in-blank
                                    # quiz questions from a { topic, count } body
      upload/
        route.ts                  # POST — accepts a file, extracts text,
                                    # chunks it, embeds chunks (Cohere),
                                    # upserts into Pinecone
      embed-test/
        route.ts                  # GET  — proves embedding + Pinecone connection
                                    # (can be deleted, was scaffolding-only)
      retrieve-test/
        route.ts                  # POST — embeds a { question }, queries
                                    # Pinecone, returns top-k matching chunks
```

## How the RAG pipeline works (what each route does)

**Ingestion** (`/api/upload`):
```
file upload → extract text → chunk (600 tokens, 100 overlap)
→ embed each chunk (Cohere, inputType: search_document)
→ upsert into Pinecone with metadata (filename, documentId, chunkIndex)
```

**Retrieval** (`/api/retrieve-test` — prototype, not yet wired into generation):
```
question → embed (Cohere, inputType: search_query)
→ query Pinecone (topK: 3) → return matched chunks + similarity scores
```

**Generation** (`/api/test` — currently topic-based, not yet retrieval-based):
```
{ topic, count } → prompt Groq with a JSON response_format
→ parse structured { questions: [...] } → return to frontend
```

## Roadmap — what's left

- [ ] Wire retrieval into `/api/test`: replace the typed `topic` string with
      chunks retrieved from Pinecone, so quizzes are generated from the
      actual uploaded document instead of general model knowledge
- [ ] Apply a similarity-score threshold on retrieval (seen in testing:
      relevant chunks scored ~0.6, irrelevant ones ~0.3 — a threshold around
      0.4 looks like a reasonable starting cutoff) and return
      "not found in your documents" below it
- [ ] Build real `QuestionCard` UI for `/quiz` (MCQ + fill-in-blank), replacing
      the current placeholder pages
- [ ] Build the score screen with per-type breakdown and a missed-questions list
- [ ] Add `.pdf` support to `/api/upload` (currently `.md`/`.txt` only) using
      `pdf-parse`
- [ ] Grade fill-in-blank answers via LLM (semantic match, not exact string)
- [ ] Add MD/PDF export of a generated quiz
- [ ] Add a request queue + exponential backoff for LLM/embedding calls, to
      handle concurrent users gracefully once traffic grows past a few
      simultaneous requests
- [ ] Persistence beyond Pinecone (e.g. Postgres for quiz history, user
      accounts, scores over time)

## Notes for future me

- Cohere's `embed-v4.0` needs `inputType` set correctly: `search_document`
  when embedding content to store, `search_query` when embedding a question
  to search with. Same model, different vector shaping — getting this
  backwards silently degrades match quality rather than erroring.
- Pinecone's SDK expects `index.upsert({ records: [...] })` — passing a raw
  array (older SDK versions' syntax) throws a type error.
- Groq deprecates model names periodically — if a `model_not_found` error
  shows up, check https://console.groq.com/docs/models for the current list.