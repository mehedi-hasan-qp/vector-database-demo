// STEP 8: Break it on purpose - ask something the documents can't answer.
//
// The collection is all backend infrastructure docs. Nothing in it mentions
// France. Run the same retrieval through two different system prompts and
// watch only one of them refuse to make something up.
//
// The query is fixed rather than CLI-overridable (same reasoning as step4):
// this demo only lands if the question is guaranteed to be unanswerable.
import { createClient, runStep, COLLECTION_NAME } from "./chroma-client.js";
import { createGeminiClient, generateAnswer, requireApiKey, MODEL_NAME } from "./gemini-client.js";

const QUERY_TEXT = "What's the capital of France?";
const N_RESULTS = 3;

await runStep("step8-break-it-on-purpose", async () => {
  requireApiKey();

  const client = createClient();
  await client.heartbeat();

  const collection = await client.getOrCreateCollection({ name: COLLECTION_NAME });

  console.log(`Query: "${QUERY_TEXT}"`);
  console.log(`Retrieved ${N_RESULTS} documents as context (note: none of them are about France):\n`);

  const results = await collection.query({
    queryTexts: [QUERY_TEXT],
    nResults: N_RESULTS,
  });

  const rows = results.rows()[0] ?? [];
  rows.forEach((row, i) => console.log(`${i + 1}. "${row.document}"`));

  const context = rows.map((row) => row.document).join("\n\n");

  // Identical context, identical question - the only difference is the
  // sentence telling the model what to do when the answer isn't there.
  const guardedPrompt = `Answer using ONLY the following context. If the answer is not in the context, say "I don't have enough information to answer that" — do not guess.\n\nContext:\n${context}`;
  const unguardedPrompt = `Answer the user's question.\n\nContext:\n${context}`;

  const ai = createGeminiClient();

  console.log(`\nAsking ${MODEL_NAME} the same question twice, with two different system prompts ...\n`);

  const guarded = await generateAnswer(ai, guardedPrompt, QUERY_TEXT);
  const unguarded = await generateAnswer(ai, unguardedPrompt, QUERY_TEXT);

  console.log("WITH guardrail:");
  console.log(`   ${guarded.trim()}\n`);

  console.log("WITHOUT guardrail:");
  console.log(`   ${unguarded.trim()}\n`);
});
