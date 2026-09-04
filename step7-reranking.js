// STEP 7: Retrieve a wider net, then let Gemini rerank it.
//
// Vector search is fast but shallow - it ranks by embedding distance alone.
// So: pull 10 candidates instead of 3, then ask the model to read them and
// pick the best 3. Cheap search casts the net, the expensive model narrows it.
import { createClient, runStep, COLLECTION_NAME } from "./chroma-client.js";
import { createGeminiClient, generateAnswer, requireApiKey, MODEL_NAME } from "./gemini-client.js";

const QUERY_TEXT = process.argv.slice(2).join(" ") || "How can I improve database connection performance?";
const N_CANDIDATES = 10;
const N_FINAL = 3;

const RERANK_PROMPT =
  "Rank these passages by relevance. Return only the top 3 numbers, most relevant first.";

await runStep("step7-reranking", async () => {
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
  console.log(`Retrieving ${N_CANDIDATES} candidates by vector similarity:\n`);

  const results = await collection.query({
    queryTexts: [QUERY_TEXT],
    nResults: N_CANDIDATES,
  });

  const candidates = results.rows()[0] ?? [];

  candidates.forEach((row, i) => {
    const distance = typeof row.distance === "number" ? row.distance.toFixed(4) : "n/a";
    console.log(`${i + 1}. [distance: ${distance}] "${row.document}"`);
  });

  // The model sees a numbered list and answers with numbers, so the passages
  // are labelled 1..N here and mapped back to array indices below.
  const numbered = candidates.map((row, i) => `${i + 1}. ${row.document}`).join("\n");

  const ai = createGeminiClient();

  console.log(`\nAsking ${MODEL_NAME} to rerank those ${candidates.length} passages ...\n`);

  const ranking = await generateAnswer(
    ai,
    RERANK_PROMPT,
    `Question: ${QUERY_TEXT}\n\nPassages:\n${numbered}`
  );

  // The model is asked for bare numbers ("5, 1, 3"), but live it sometimes
  // answers as its own numbered list ("1. Passage 5") instead. In that shape
  // the leading "1." is the rank, not the pick, so strip those prefixes first
  // and read the number that follows.
  const cleaned = /^\s*\d+[.)]\s/m.test(ranking)
    ? ranking.replace(/^\s*\d+[.)]\s*/gm, "")
    : ranking;

  // Pull the numbers out, drop anything out of range or repeated, keep N_FINAL.
  const picked = [...new Set((cleaned.match(/\d+/g) ?? []).map(Number))]
    .filter((n) => n >= 1 && n <= candidates.length)
    .slice(0, N_FINAL);

  // If the model answered in some unexpected shape, fall back to the vector
  // order rather than dying on stage.
  const finalIndices = picked.length > 0 ? picked : candidates.slice(0, N_FINAL).map((_, i) => i + 1);

  console.log("Reranked top 3 (was → now):\n");
  finalIndices.forEach((n, i) => {
    console.log(`${i + 1}. (originally #${n}) "${candidates[n - 1].document}"`);
  });

  const context = finalIndices.map((n) => candidates[n - 1].document).join("\n\n");

  const systemPrompt = `Answer using ONLY the following context. If the answer is not in the context, say "I don't have enough information to answer that" — do not guess.\n\nContext:\n${context}`;

  console.log(`\nAsking ${MODEL_NAME} to answer from the reranked context ...\n`);

  const answer = await generateAnswer(ai, systemPrompt, QUERY_TEXT);

  console.log("Grounded answer:");
  console.log(`   ${answer.trim()}\n`);
});
