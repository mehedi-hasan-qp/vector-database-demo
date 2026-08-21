// STEP 3: Query the collection using natural language and show the top matches.
import { createClient, runStep, printResults, COLLECTION_NAME } from "./chroma-client.js";

const QUERY_TEXT = "How can I improve database connection performance?";
const N_RESULTS = 5;

await runStep("step3-query", async () => {
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
  console.log(`Top ${N_RESULTS} results:\n`);

  const results = await collection.query({
    queryTexts: [QUERY_TEXT],
    nResults: N_RESULTS,
  });

  printResults(results);
});
