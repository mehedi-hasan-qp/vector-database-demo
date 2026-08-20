import { ChromaClient } from "chromadb";

const CHROMA_HOST = "localhost";
const CHROMA_PORT = 8000;

export const COLLECTION_NAME = "documents";

export function createClient() {
  return new ChromaClient({ host: CHROMA_HOST, port: CHROMA_PORT });
}

// Prints query results as a readable ranked list instead of raw JSON.
export function printResults(queryResult) {
  const rows = queryResult.rows()[0] ?? [];

  if (rows.length === 0) {
    console.log("(no matching results)");
    return;
  }

  rows.forEach((row, i) => {
    const distance = typeof row.distance === "number" ? row.distance.toFixed(4) : "n/a";
    const technology = row.metadata?.technology ?? "unknown";
    console.log(`${i + 1}. [distance: ${distance}] (technology: ${technology})`);
    console.log(`   "${row.document}"\n`);
  });
}

// Wraps a demo step so live-audience errors are readable instead of a raw stack trace.
export async function runStep(stepName, fn) {
  try {
    await fn();
  } catch (err) {
    console.error(`\n❌ ${stepName} failed.\n`);

    const isConnectionError =
      err?.name === "ChromaConnectionError" ||
      err?.cause?.code === "ECONNREFUSED" ||
      /fetch failed|failed to connect/i.test(err?.message ?? "");

    if (isConnectionError) {
      console.error(
        `Could not reach the Chroma server at http://${CHROMA_HOST}:${CHROMA_PORT}.\n` +
          `  → Is the server running? Start it with: docker compose up -d\n` +
          `  → Check status with: docker compose ps\n`
      );
    } else if (/does not exist|not found/i.test(err?.message ?? "")) {
      console.error(
        `The "${COLLECTION_NAME}" collection was not found.\n` +
          `  → Run step1-setup.js first to create it.\n`
      );
    } else {
      console.error(`Details: ${err?.message ?? err}\n`);
    }

    process.exitCode = 1;
  }
}
