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
on your machine, no API key required.

## Run it

```bash
npm install
docker compose up -d          # starts Chroma on localhost:8000

node step1-setup.js           # connect, create the "documents" collection
node step2-add-docs.js        # add 4 sample docs with metadata
node step3-query.js           # semantic search, top 3 matches
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
- **step2-add-docs.js** — adds 4 documents (about Redis, RabbitMQ, PostgreSQL,
  Kubernetes), each with a `technology` metadata field.
- **step3-query.js** — queries with `"How can I improve database connection
  performance?"` and prints the top 3 matches by semantic similarity. Note
  none of these words appear in the PostgreSQL doc — it still ranks first,
  because the match is on meaning, not keywords.
- **step4-metadata-filter.js** — same query, but with a `where: { technology:
  "postgres" }` filter, so only that one document is eligible to match.

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
