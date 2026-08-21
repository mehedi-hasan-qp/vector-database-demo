// STEP 2: Add sample documents (with metadata) to the "documents" collection.
import { createClient, runStep, COLLECTION_NAME } from "./chroma-client.js";

// `id` is an arbitrary string you choose - could be a UUID or a database row ID.
// Using readable slugs here purely so the demo output is easy to follow.
const documents = [
  {
    id: "redis",
    text: "Redis is used for caching frequently accessed data.",
    technology: "redis",
  },
  {
    id: "rabbitmq",
    text: "RabbitMQ provides asynchronous communication between microservices.",
    technology: "rabbitmq",
  },
  {
    id: "postgres",
    text: "PostgreSQL connection pools reduce the cost of creating database connections.",
    technology: "postgres",
  },
  {
    id: "kubernetes",
    text: "Kubernetes automatically restarts failed containers.",
    technology: "kubernetes",
  },
];

await runStep("step2-add-docs", async () => {
  const client = createClient();
  await client.heartbeat();

  const collection = await client.getOrCreateCollection({ name: COLLECTION_NAME });

  console.log(`Adding ${documents.length} documents to "${COLLECTION_NAME}" ...`);

  await collection.add({
    ids: documents.map((d) => d.id),
    documents: documents.map((d) => d.text),
    metadatas: documents.map((d) => ({ technology: d.technology })),
  });

  const count = await collection.count();

  console.log(`\n✅ Added ${documents.length} documents. Collection now has ${count} total.`);
  documents.forEach((d) => console.log(`   - [${d.id}] (${d.technology}): "${d.text}"`));
  console.log(`\n   You can now run: node step3-query.js\n`);
});
