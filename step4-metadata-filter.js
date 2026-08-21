// STEP 4: Same query as step 3, but filtered to only match documents where technology = "postgres".
//
// Without this filter (see step3), both the postgres and mysql documents are
// strong semantic matches for this query - they're about the same topic.
// The metadata filter lets you narrow to just one of them deterministically,
// on top of the semantic ranking.
import { createClient, runStep, printResults, COLLECTION_NAME } from "./chroma-client.js";

// Pass a custom query as a CLI arg to try your own during a live demo, e.g.:
//   node step4-metadata-filter.js "How do I scale read traffic across database replicas?"
// Falls back to the default query below if none is given.
const QUERY_TEXT = process.argv.slice(2).join(" ") || "How can I improve database connection performance?";
const N_RESULTS = 5;
const METADATA_FILTER = { technology: "postgres" };

await runStep("step4-metadata-filter", async () => {
  const client = createClient();
  await client.heartbeat();

  const collection = await client.getOrCreateCollection({ name: COLLECTION_NAME });

  const count = await collection.count();
  if (count === 0) {
    throw new Error(
      `The "${COLLECTION_NAME}" collection is empty. Run step2-add-docs.js before querying.`
    );
  }

  console.log(`Query: "${QUERY_TEXT}"`);
  console.log(`Metadata filter: ${JSON.stringify(METADATA_FILTER)}`);
  console.log(`Top ${N_RESULTS} results:\n`);

  const results = await collection.query({
    queryTexts: [QUERY_TEXT],
    nResults: N_RESULTS,
    where: METADATA_FILTER,
  });

  printResults(results);
});
