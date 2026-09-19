# Quizora — AI Document Q&A / Quiz Generator

A RAG (Retrieval-Augmented Generation) app: upload documents (`.md`, `.pdf`),
generate quizzes grounded in that content, share them via a short code, and
export as PDF. Two frontends share this one backend: a Next.js web app
(this repo) and **Quizdian**, a companion Obsidian plugin that generates
quizzes directly from notes in a vault (see its own README, linked below).

**Live:** https://your-project.vercel.app _(replace with your actual Vercel URL)_

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
| PDF generation (quiz export) | `pdfkit` |
| Hosting | Vercel |

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

`src/db/schema.ts` defines a `quizzes` table, keyed by a short random code
(format: `xxxx-xxx-xxxx`, lowercase letters + numbers, e.g. `k3f9-x8q-p4mz`)
instead of an auto-incrementing ID — this is what makes a quiz
shareable/re-openable via URL or a typed-in code:

```ts
export const quizzes = pgTable("quizzes", {
  code: text("code").primaryKey(),
  title: text("title").notNull(),
  topic: text("topic").notNull(),
  questions: jsonb("questions").notNull(),
  sources: jsonb("sources").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

Code generation (`generateCode()`, in `/api/save-quiz`) uses `nanoid`'s
`customAlphabet`, restricted to lowercase letters + digits, in a 4-3-4
segment pattern — not the topic/slug-based approach used earlier, since a
topic-based code doesn't make sense once one quiz can draw from a document
covering multiple topics.

## Local setup

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deployment (Vercel)

1. Push this repo to GitHub.
2. Vercel → Add New → Project → import the repo (Next.js is auto-detected,
   no build config needed).
3. Add every environment variable from `.env.local` in Project Settings →
   Environment Variables — Vercel does **not** read your local `.env.local`
   file; each key has to be re-entered in the dashboard, scoped to
   Production (and Preview if you want preview deploys to work too).
4. If using Vercel's native Neon integration (Storage tab) instead of a
   manually-pasted `DATABASE_URL`, double-check the integration actually
   creates a variable named exactly `DATABASE_URL` — it also creates several
   differently-named variants (`POSTGRES_URL`, `PGHOST`, etc.); the app's
   code specifically reads `process.env.DATABASE_URL`.
5. Deploy. Adding env vars after a failed build does not retrigger it —
   redeploy manually (Deployments → latest → ⋯ → Redeploy) or push a new
   commit.
6. Verify live, not just that the build succeeded: run through
   upload → generate → review → save → take quiz → score on the deployed
   URL. A successful build only proves the code compiles, not that Groq /
   Pinecone / Cohere / Postgres are actually reachable from Vercel's servers.

### CORS

Every route the Obsidian plugin calls (`generate-from-text`, `save-quiz`,
`quiz/[code]` GET + PATCH, `grade`) has explicit CORS headers
(`Access-Control-Allow-Origin: "*"`) and an `OPTIONS` handler. This is
required because the plugin runs from Obsidian's own origin
(`app://obsidian.md`), not `localhost:3000` — a cross-origin request needs
the server's explicit permission, and the browser/Electron sends a preflight
`OPTIONS` request first to check for that permission before sending the
real one. Routes only ever called by this web app itself (same-origin)
don't need this.

## Project structure (routes built so far)

```
src/
  app/
    layout.tsx              # root layout, imports global.css
    global.css               # @import "tailwindcss";
    page.tsx                  # home page
    generate/
      page.tsx                 # 4-step flow: upload file -> set question count
                                 # -> review generated questions + set title
                                 # -> "Generate Code" (saves + shows shareable code)
    join/
      page.tsx                 # enter a code -> confirms the quiz title ->
                                 # start button -> /quiz?code=...
    quiz/
      page.tsx                  # reads ?code= from the URL, fetches the quiz
                                  # via /api/quiz/[code], renders question cards
                                  # (MCQ + fill-in-blank), progress bar, saves
                                  # answers to sessionStorage, redirects to /score
    score/
      page.tsx                   # score screen — MCQ graded instantly (client-side
                                   # comparison), fill-in-blank graded via /api/grade,
                                   # shows missed questions + sources
    api/
      generate-preview/
        route.ts                  # POST — takes { documentId, filename, count },
                                    # filters Pinecone by documentId (not similarity
                                    # search — pulls every chunk belonging to that
                                    # specific uploaded doc), generates questions,
                                    # returns them for review WITHOUT saving
      save-quiz/
        route.ts                  # POST — takes { title, topic, questions, sources },
                                    # generates a random 4-3-4 code, inserts into
                                    # Postgres, returns { code, title }
      quiz/[code]/
        route.ts                  # GET  — dynamic route, looks up a quiz by code,
                                    # 404s with a clear message if not found.
                                    # PATCH — updates a quiz's title after the fact
                                    # (used when editing the title post-save).
                                    # CORS-enabled (called by the Obsidian plugin too)
      grade/
        route.ts                  # POST — batches fill-in-blank answers, asks the LLM
                                    # to judge semantic correctness (not exact string match).
                                    # CORS-enabled (called by the Obsidian plugin too)
      generate-from-text/
        route.ts                  # POST — takes raw { text, count } directly (no Pinecone
                                    # lookup) — used by the Obsidian plugin, which already
                                    # has a note's full text in hand and skips retrieval
                                    # entirely for a single note. CORS-enabled
      export/[code]/
        route.ts                  # GET  — ?answers=true|false — builds a PDF (via pdfkit)
                                    # of a saved quiz, worksheet or answer-key version
      upload/
        route.ts                  # POST — accepts .md/.txt/.pdf, extracts text
                                    # (pdf-parse v2 for PDFs), chunks (600 tokens,
                                    # 100 overlap), embeds (Cohere), upserts into
                                    # Pinecone with documentId in metadata
  db/
    schema.ts                 # Drizzle schema — quizzes table, keyed by code
```

Note: `/api/test`, `/api/embed-test`, and `/api/retrieve-test` — the original
scaffolding/single-shot routes used while first building the RAG pipeline —
have been deleted now that `/generate`'s preview → review → save flow fully
replaced them.

## How the RAG pipeline works (what each route does)

**Ingestion** (`/api/upload`):
```
file upload (.md/.txt/.pdf) → extract text → chunk (600 tokens, 100 overlap)
→ embed each chunk (Cohere, inputType: search_document)
→ upsert into Pinecone with metadata (filename, documentId, chunkIndex)
```

**Generation flow** (`/generate` page — upload → preview → save):
```
1. Upload a file -> /api/upload -> get back { documentId, filename }
2. Set question count -> /api/generate-preview:
   filter Pinecone by documentId (exact match, not similarity search —
   this generates from ONE specific uploaded document, not a topic
   searched across everything) -> prompt Groq (context-only, no
   outside knowledge) -> return { questions } WITHOUT saving anything
3. Review questions + correct answers in the UI, set a title
4. "Generate Code" -> /api/save-quiz -> random code + Postgres insert
   -> { code, title } shown, ready to share
```

Note: `/api/test` (topic-based similarity search across all documents,
with a 0.4 similarity threshold) still exists and works — it was the
original single-shot generation route, kept for reference/testing, but
`/generate` now uses the preview→review→save flow above instead.

**Answer grading** (client-side + `/api/grade`):
```
MCQ  → compared instantly in the browser, zero API calls
Fill-in-blank → batched into one call to /api/grade, LLM judges
                semantic correctness (allows different phrasing)
```

**PDF export** (`/api/export/[code]`):
```
?answers=false → worksheet (questions + blank/options, no answers marked)
?answers=true  → answer key (correct MCQ option marked, fill-in-blank
                 answer shown) — same route, one query param decides which
                 version is built, via pdfkit
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
- [x] **Shareable quiz codes** — Postgres (Neon) table keyed by a random
      4-3-4 code, generated only after an explicit review step (nothing
      saved until the user confirms questions + sets a title and clicks
      "Generate Code"). Retrievable via `/api/quiz/[code]`, with a `/join`
      page to look up a code and confirm the title before starting.
- [x] Generation scoped to one specific uploaded document (filtered by
      `documentId` in Pinecone) rather than a topic searched across every
      uploaded document — matches the actual intended flow: upload a
      file, generate a quiz from that file
- [x] **PDF export** of a generated quiz — worksheet and answer-key
      versions, via `pdfkit` (chosen over `jsPDF` due to a known
      server-side concurrent-request vulnerability in jsPDF's Node build,
      CVE-2026-24040)
- [x] **Deployed to Vercel**, CORS-enabled on every route a second
      frontend (the Obsidian plugin) calls
- [x] **Quizdian** — a companion Obsidian plugin, separate repo, calling
      this same backend. Generates quizzes directly from one or more notes
      in a vault (skips upload/Pinecone entirely for a single note — the
      note's full text is sent directly as context via
      `/api/generate-from-text`), supports joining a quiz by code, local
      history of generated/joined quizzes, and a settings tab for the
      backend URL. See its own README.

## Phase 2 — in progress

- [ ] Request queue + exponential backoff for LLM/embedding calls, for
      when multiple users hit the app concurrently — worth reconsidering
      now that the backend is live and could see real concurrent traffic
- [ ] Visual/design polish (currently plain Tailwind defaults)
- [ ] Editing a quiz's title after save currently only works from the
      Obsidian plugin (`PATCH /api/quiz/[code]`, wired to the title
      field's blur event) — the web app's `/generate` review step doesn't
      have the same "edit after save" capability yet

## Phase 3 — later

- [ ] Results table (who took a quiz, score, timestamp) — scores currently
      aren't persisted anywhere once the quiz session ends
- [ ] User accounts / quiz history across sessions (web app side — Quizdian
      already has this locally, per-vault)
- [ ] Caching identical fill-in-blank answers to cut down on `/api/grade` calls
- [ ] OCR support for scanned (image-only) PDFs — currently unsupported,
      `pdf-parse` returns an empty-text error for these
- [ ] Tighten CORS from `Access-Control-Allow-Origin: "*"` to an explicit
      allowlist (this web app's domain, `app://obsidian.md`) before any
      wider release
- [ ] Package Quizdian for distribution beyond local testing — either
      informal (zip `main.js` + `manifest.json` + `styles.css` for someone
      to drop into their own vault) or a full public community-plugin
      directory submission (needs its own repo — already set up — a
      README, LICENSE, and a review pass for stray logging / the
      "no 'Obsidian' in the description" rule)

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
- In recent Next.js versions, dynamic route `params` (e.g. `[code]`) are a
  `Promise`, not a plain object — type it as
  `{ params: Promise<{ code: string }> }` and `await params` before reading
  properties off it.
- `<input type="file">` can't be restyled directly across browsers — the
  standard fix is wrapping it in a `<label>` (styled however you want) with
  the real input hidden (`className="hidden"`) inside it; clicking the label
  triggers the hidden input natively.
- Any component using `useSearchParams()` must be wrapped in `<Suspense>` or
  the production build fails ("Error occurred prerendering page") — this
  doesn't surface in `npm run dev`, only in a full `npm run build` /
  production deploy, since dev mode skips static prerendering.
- Vercel does not read `.env.local` — every environment variable has to be
  manually re-entered in the dashboard (Project Settings → Environment
  Variables) before the first deploy, or the build crashes the moment a
  route that reads `process.env.SOMETHING` is evaluated.
- A successful Vercel build only proves the code compiles — it doesn't
  prove the deployed app can actually reach Groq/Pinecone/Cohere/Postgres.
  Always run the real flow on the live URL once, not just check for a
  green checkmark.
- Chose `pdfkit` over `jsPDF` for quiz PDF export specifically because of a
  jsPDF Node.js server-side vulnerability (CVE-2026-24040) affecting
  concurrent requests — relevant here since PDF generation happens in a
  server API route that could, in principle, serve multiple people at once.