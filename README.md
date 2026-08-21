# Vector Database Demo

A minimal, working example of vector search using [ChromaDB](https://www.trychroma.com/)'s
JavaScript client — plain Node.js, no framework, four small scripts.

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

## Run it

```bash
npm install
docker compose up -d          # starts Chroma on localhost:8000

node step1-setup.js           # connect, create the "documents" collection
node step2-add-docs.js        # add 12 sample docs with metadata
node step3-query.js           # semantic search, top 5 matches
node step4-metadata-filter.js # same search, filtered by metadata
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

Both step3 and step4 accept a custom query as a command-line argument, so
you can try audience-suggested queries live instead of editing the file:

```bash
node step3-query.js "How do I scale read traffic across database replicas?"
node step4-metadata-filter.js "What's a good recipe for chocolate cake?"
```

Quote the query so it's passed as a single argument. Running either script
with no argument falls back to the default database-performance query.

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

## Files

- `chroma-client.js` — shared client setup, error handling, result printing
- `step1-setup.js`, `step2-add-docs.js`, `step3-query.js`, `step4-metadata-filter.js` — the demo
- `docker-compose.yml` — local Chroma server
