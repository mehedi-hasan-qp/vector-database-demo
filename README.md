# Vector Database Demo

A minimal, working example of vector search using [ChromaDB](https://www.trychroma.com/)'s
JavaScript client, plus a retrieval-augmented generation (RAG) layer on top of
it using the Gemini API — plain Node.js, no framework, eight small scripts.

## How it works

Chroma stores text as embeddings (vectors that represent meaning) and lets you
search by semantic similarity instead of exact keyword match. The JS client
talks to Chroma over HTTP, so you need a Chroma server running — unlike the
Python client, which can run in-memory with no server.

Embeddings are generated automatically on `.add()` and `.query()` using
Chroma's default local embedding model (`@chroma-core/default-embed`) — runs
on your machine, no API key required. It's `Xenova/all-MiniLM-L6-v2`
(384-dimensional vectors), the same default the Python client uses.

Chroma also builds a vector index (HNSW) on the collection automatically —
that's what makes similarity search fast instead of comparing the query
against every stored vector one by one. You never configure this yourself;
it's just there, unlike SQL where you'd run `CREATE INDEX` explicitly.

## What RAG adds

Steps 1–4 stop at retrieval: you get back the closest documents and read them
yourself. Retrieval-augmented generation (steps 5–8) adds one more move — take
those retrieved documents, paste them into the prompt as context, and have a
language model write the answer from them.

That's the whole trick. The model isn't trained on your documents and doesn't
"know" them; it's reading them off the prompt each time, the same way you'd
answer a question with the reference material open in front of you. Which
means the quality of the answer is capped by the quality of the retrieval —
if the right document doesn't come back from Chroma, the model never sees it.
That's why steps 6 and 7 spend their effort on *improving retrieval* (rewrite
the query, rerank the results) rather than on prompting tricks.

The guardrail sentence in the system prompt is doing real work:

> If the answer is not in the context, say "I don't have enough information to
> answer that" — do not guess.

Without it, a model handed irrelevant context will still answer, because
answering is what it does — it falls back on its training data and produces
something fluent and unsourced. That's the failure mode people mean by
"hallucination," and in a RAG system it's especially dangerous: the answer
*looks* grounded, because the surrounding machinery says it was retrieved. The
guardrail gives the model an explicit, acceptable way to say nothing.

**step8 demonstrates exactly that.** It asks "What's the capital of France?"
against a collection that contains only backend-infrastructure documents.
Chroma still returns three documents — vector search always returns its
nearest neighbours, however far away they are; there's no "no match" result.
The same question then runs through two system prompts, one with the guardrail
sentence and one without. The guarded one declines. The unguarded one cheerfully
answers "Paris" — correct, but *not from your documents*, which is precisely
the behaviour you don't want in a system whose entire premise is that answers
come from your own data.

## Run it

### Prerequisites

- Node.js 18+ and Docker.
- A **Gemini API key**, for steps 5–8 only. Steps 1–4 are pure vector search
  and need no key at all.

Get a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
(free tier is plenty for this demo), then set it as an environment variable in
the shell you'll run the scripts from:

```bash
export GEMINI_API_KEY="your-key-here"
```

The scripts read it from `process.env.GEMINI_API_KEY` and nowhere else. Don't
put it in `package.json`, a committed `.env`, or any other file in the repo —
it's a secret, and it's the one piece of config here that isn't hardcoded. To
keep it across shell sessions, add that `export` line to your `~/.zshrc` or
`~/.bashrc` rather than to anything in this directory.

### The scripts

```bash
npm install
docker compose up -d               # starts Chroma on localhost:8000

node step1-setup.js                # connect, create the "documents" collection
node step2-add-docs.js             # add 12 sample docs with metadata
node step3-query.js                # semantic search, top 5 matches
node step4-metadata-filter.js      # same search, filtered by metadata

export GEMINI_API_KEY="your-key-here"   # steps 5-8 need this

node step5-generate.js             # RAG: answer generated from retrieved docs
node step6-query-rewriting.js      # rewrite a vague query before retrieving
node step7-reranking.js            # retrieve 10, let the model pick the best 3
node step8-break-it-on-purpose.js  # ask something the docs can't answer
```

Run them in that order — each one depends on the state the previous one created.

To stop the server: `docker compose down` (add `-v` to wipe stored data too).

## Browsing the data (optional)

There's an optional web UI for browsing collections/documents/metadata
without writing code, powered by
[chromadb-admin](https://github.com/flanksource/chromadb-admin). It's kept
out of the default `docker compose up` because its image is ~5GB — only pull
it if you want it:

```bash
docker compose -f docker-compose.yml -f docker-compose.admin.yml up -d
```

Then open **http://localhost:3001** and fill in the setup form:

| Field | Value |
|---|---|
| Chroma connection string | `http://chroma:8000` |
| Tenant | `default_tenant` |
| Database | `default_database` |
| Authentication Type | `No Auth` |

Use `http://chroma:8000`, **not** `http://localhost:8000` — the admin UI
runs in its own container, and `chroma` is the Docker network hostname for
the Chroma server container. Using `localhost` here points the admin
container at itself and fails with a `500 Internal Server Error` /
`ECONNREFUSED`.

## What each script does

- **step1-setup.js** — connects to Chroma, creates a collection called `documents`.
- **step2-add-docs.js** — adds 12 documents about common backend
  technologies, each with a `technology` metadata field. Several pairs cover
  similar ground on purpose (Redis/Memcached, RabbitMQ/Kafka,
  PostgreSQL/MySQL) so the ranking in step3/step4 shows real nuance, not just
  "related vs. unrelated."
- **step3-query.js** — queries with `"How can I improve database connection
  performance?"` and prints the top 5 matches by semantic similarity. None
  of these words appear in the PostgreSQL doc — it still ranks first, because
  the match is on meaning, not keywords. Worth pointing out live: MySQL ranks
  a close second (also about databases), while Redis/Memcached/Kafka trail
  further behind despite being backend infra too — the model is ranking by
  actual topical closeness, not just "any tech doc."
- **step4-metadata-filter.js** — same query, but with a `where: { technology:
  "postgres" }` filter. Without it, both postgres and mysql are strong
  matches; the filter narrows deterministically to just one.

- **step5-generate.js** — the basic RAG loop. Runs step3's retrieval, joins
  the top 3 documents into a context block, and asks Gemini to answer the
  question using only that context. Same retrieval as before; the new part is
  the generated, grounded answer at the end.
- **step6-query-rewriting.js** — puts a rewrite step *in front of* retrieval.
  The default question is deliberately sloppy (`"how do i make my db
  connections faster"`); Gemini rewrites it into something precise, and the
  rewritten version is what gets embedded and searched. Both are printed, so
  the audience can see what changed and how the retrieved documents shift.
- **step7-reranking.js** — retrieves 10 candidates instead of 3, then hands
  the numbered list to Gemini and asks for the best 3. Prints the original
  vector-similarity order and the reranked order side by side, so you can see
  what moved. Vector distance is a cheap approximation of relevance; a model
  that actually reads the passages is a better, slower judge. Casting a wide
  net cheaply and narrowing it expensively is the standard two-stage pattern.
- **step8-break-it-on-purpose.js** — the failure demo. See
  [What RAG adds](#what-rag-adds) above for what it's showing.

step3, step5, step6 and step7 accept a custom query as a command-line
argument, so you can try audience-suggested queries live instead of editing
the file:

```bash
node step3-query.js "How do I scale read traffic across database replicas?"
node step6-query-rewriting.js "whats the deal with those message queue things"
```

Quote the query so it's passed as a single argument. Running with no
argument falls back to that script's default query.

step4 and step8 are deliberately **not** overridable — both are making a
specific point (the metadata filter, the missing-answer failure) that only
works with their fixed query.

## Troubleshooting

- **"Could not reach the Chroma server..."** — server isn't running. Run
  `docker compose up -d`, check with `docker compose ps`.
- **Port 8000 already in use** — something else is bound to it. Check with
  `lsof -i :8000`, or remap the port in `docker-compose.yml` and update the
  port in `chroma-client.js` to match.
- **"The documents collection is empty..."** — you ran step3/step4 before
  step2. Run the scripts in order.
- **Admin UI shows "API getCollections returns response code: 500"** — you
  entered `http://localhost:8000` in the admin UI's setup form. Use
  `http://chroma:8000` instead (see [Browsing the data](#browsing-the-data-optional)).
- **"Gemini could not authenticate..."** — `GEMINI_API_KEY` is missing or
  invalid in the shell you're running from. Check with `echo $GEMINI_API_KEY`;
  if it's empty, `export GEMINI_API_KEY="your-key-here"`. Note that each new
  terminal tab starts fresh unless you've added the export to your shell
  profile — a common one to hit mid-talk after opening a new tab. If it's set
  but still rejected, the key was mistyped, revoked, or belongs to a project
  without the Gemini API enabled; generate a new one at
  [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
- **`429 RESOURCE_EXHAUSTED` / "quota exceeded" / rate-limit errors from
  Gemini** — the free tier caps requests per minute, and steps 5–8 fire
  several calls in quick succession (step7 makes two, step8 makes two). Wait
  a minute and re-run. If you're rehearsing the talk repeatedly, space the
  runs out, or switch `MODEL_NAME` in `gemini-client.js` to a lighter model
  such as `gemini-2.5-flash-lite`, which has a more generous free quota.

## Files

- `chroma-client.js` — shared Chroma client setup, error handling, result printing
- `gemini-client.js` — shared Gemini client setup, model name, answer generation
- `step1-setup.js`, `step2-add-docs.js`, `step3-query.js`, `step4-metadata-filter.js` — vector search
- `step5-generate.js`, `step6-query-rewriting.js`, `step7-reranking.js`, `step8-break-it-on-purpose.js` — RAG
- `docker-compose.yml` — local Chroma server
