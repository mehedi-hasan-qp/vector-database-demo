// STEP 4: Same query as step 3, but filtered to only match documents where technology = "postgres".
import { createClient, runStep, printResults, COLLECTION_NAME } from "./chroma-client.js";

const QUERY_TEXT = "How can I improve database connection performance?";
const N_RESULTS = 3;
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
