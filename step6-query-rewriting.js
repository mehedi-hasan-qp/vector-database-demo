// STEP 6: Same RAG loop as step5, but Gemini rewrites the question first.
//
// Vague, conversational questions embed poorly - the vector for "how do i make
// my db connections faster" is fuzzier than the vector for a precise, specific
// version of the same question. Rewriting before retrieval improves the search,
// which improves everything downstream.
import { createClient, runStep, printResults, COLLECTION_NAME } from "./chroma-client.js";
import { createGeminiClient, generateAnswer, requireApiKey, MODEL_NAME } from "./gemini-client.js";

// Deliberately messy default, so the rewrite has something to clean up.
// Override it live with your own sloppy question:
//   node step6-query-rewriting.js "whats the deal with those message queue things"
const QUERY_TEXT = process.argv.slice(2).join(" ") || "how do i make my db connections faster";
const N_RESULTS = 3;

const REWRITE_PROMPT =
  "Rewrite the user's question to be clearer and more specific for a search engine. Return ONLY the rewritten question.";

await runStep("step6-query-rewriting", async () => {
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

  const ai = createGeminiClient();

  console.log(`Original query:  "${QUERY_TEXT}"`);

  const rewritten = (await generateAnswer(ai, REWRITE_PROMPT, QUERY_TEXT)).trim();

  console.log(`Rewritten query: "${rewritten}"\n`);
  console.log(`Retrieving ${N_RESULTS} documents using the rewritten query:\n`);

  const results = await collection.query({
    queryTexts: [rewritten],
    nResults: N_RESULTS,
  });

  printResults(results);

  const context = (results.rows()[0] ?? []).map((row) => row.document).join("\n\n");

  const systemPrompt = `Answer using ONLY the following context. If the answer is not in the context, say "I don't have enough information to answer that" — do not guess.\n\nContext:\n${context}`;

  console.log(`Asking ${MODEL_NAME} to answer from that context ...\n`);

  const answer = await generateAnswer(ai, systemPrompt, rewritten);

  console.log("Grounded answer:");
  console.log(`   ${answer.trim()}\n`);
});
