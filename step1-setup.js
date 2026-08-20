// STEP 1: Connect to Chroma and create the "documents" collection.
import { createClient, runStep, COLLECTION_NAME } from "./chroma-client.js";

await runStep("step1-setup", async () => {
  console.log(`Connecting to Chroma server at http://localhost:8000 ...`);
  const client = createClient();

  // Confirms the server is actually reachable before doing anything else.
  await client.heartbeat();
  console.log("Connected to Chroma server.");

  const collection = await client.getOrCreateCollection({ name: COLLECTION_NAME });

  console.log(`\n✅ Collection "${collection.name}" is ready.`);
  console.log(`   You can now run: node step2-add-docs.js\n`);
});
