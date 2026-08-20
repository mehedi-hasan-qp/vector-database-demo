# ChromaDB Vector Search — Conference Demo

A hands-on demo of vector search using [ChromaDB](https://www.trychroma.com/)'s
JavaScript client. Built for a live talk aimed at backend engineers who know
JavaScript but are new to vector databases.

## Why a server is required

The ChromaDB JavaScript client is **HTTP-only** — it talks to a running Chroma
server over REST. (This is different from the Python client, which can run
fully in-memory with zero setup.) So step 0 of this demo is always: get a
Chroma server running on `localhost:8000` before touching any script.

## The narrative (4 scripts, run in order)

| Script | What it does |
|---|---|
| `step1-setup.js` | Connects to Chroma and creates the `documents` collection |
| `step2-add-docs.js` | Adds 4 sample documents, each tagged with a `technology` metadata field |
| `step3-query.js` | Runs a natural-language query and prints the top 3 semantic matches |
| `step4-metadata-filter.js` | Same query, but filtered down to only `technology: "postgres"` results |

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Start the Chroma server

```bash
docker compose up -d
```

This starts Chroma on `http://localhost:8000` with data persisted in a Docker
volume. Verify it's up:

```bash
docker compose ps
curl http://localhost:8000/api/v2/heartbeat
```

To stop it after the demo:

```bash
docker compose down
```

(Add `-v` to also delete the stored data: `docker compose down -v`.)

### 3. Run the scripts, in order

```bash
node step1-setup.js
node step2-add-docs.js
node step3-query.js
node step4-metadata-filter.js
```

Each script logs a clear success message and tells you what to run next.

> **Note on the first run:** `step2-add-docs.js` uses Chroma's default local
> embedding model (`@chroma-core/default-embed`), which runs on your machine —
> no API key needed. The very first time it runs, it may take a few extra
> seconds to load the embedding model into memory. Consider running the full
> sequence once before your talk so this warm-up doesn't happen live.

## Troubleshooting (live-demo failure points)

**"Could not reach the Chroma server..."**
The Chroma server isn't running, or isn't reachable on port 8000.
- Check it's up: `docker compose ps`
- Start it: `docker compose up -d`
- Check logs if it won't start: `docker compose logs -f`

**Port 8000 already in use / container fails to start**
Something else is bound to port 8000.
- Find what's using it: `lsof -i :8000`
- Either stop that process, or change the port mapping in `docker-compose.yml`
  (e.g. `"8001:8000"`) and update the port in `chroma-client.js` to match.

**"The documents collection is empty. Run step2-add-docs.js before querying."**
You ran `step3-query.js` or `step4-metadata-filter.js` before adding documents
(or after the collection was reset). Run the scripts in order:
`step1` → `step2` → `step3` → `step4`.

**Starting fresh / resetting the demo**
If you want to wipe all data and start the narrative over from a clean slate:

```bash
docker compose down -v
docker compose up -d
node step1-setup.js
node step2-add-docs.js
```

## Project files

- `chroma-client.js` — shared client setup, error handling, and result printing
- `step1-setup.js` / `step2-add-docs.js` / `step3-query.js` / `step4-metadata-filter.js` — the four demo steps
- `docker-compose.yml` — local Chroma server
