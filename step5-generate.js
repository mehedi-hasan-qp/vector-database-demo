// STEP 5: Retrieval-Augmented Generation - feed step3's search results to Gemini
// as context, and have it answer the question using only those documents.
import { createClient, runStep, printResults, COLLECTION_NAME } from "./chroma-client.js";
import { createGeminiClient, generateAnswer, requireApiKey, MODEL_NAME } from "./gemini-client.js";

// Same default query and CLI override as step3, e.g.:
//   node step5-generate.js "How do I scale read traffic across database replicas?"
const QUERY_TEXT = process.argv.slice(2).join(" ") || "How can I improve database connection performance?";
const N_RESULTS = 3;

await runStep("step5-generate", async () => {
  requireApiKey();

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
  console.log(`Retrieved ${N_RESULTS} documents as context:\n`);

  const results = await collection.query({
    queryTexts: [QUERY_TEXT],
    nResults: N_RESULTS,
  });

  printResults(results);

  // The retrieved documents, joined with blank lines, become the ONLY source
  // the model is allowed to answer from.
  const context = (results.rows()[0] ?? []).map((row) => row.document).join("\n\n");

  const systemPrompt = `Answer using ONLY the following context. If the answer is not in the context, say "I don't have enough information to answer that" — do not guess.\n\nContext:\n${context}`;

  console.log(`Asking ${MODEL_NAME} to answer from that context ...\n`);

  const ai = createGeminiClient();
  const answer = await generateAnswer(ai, systemPrompt, QUERY_TEXT);

  console.log("Grounded answer:");
  console.log(`   ${answer.trim()}\n`);
});
