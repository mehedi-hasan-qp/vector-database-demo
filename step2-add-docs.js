// STEP 2: Add sample documents (with metadata) to the "documents" collection.
import { createClient, runStep, COLLECTION_NAME } from "./chroma-client.js";

// `id` is an arbitrary string you choose - could be a UUID or a database row ID.
// Using readable slugs here purely so the demo output is easy to follow.
//
// A few pairs of documents cover similar ground on purpose (two caches, two
// queues, two SQL databases) so query results show real ranking nuance -
// not just "tech doc vs. unrelated doc" but "which of these two is closer".
const documents = [
  {
    id: "redis",
    text: "Redis is used for caching frequently accessed data.",
    technology: "redis",
  },
  {
    id: "memcached",
    text: "Memcached stores key-value pairs in memory to speed up read-heavy workloads.",
    technology: "memcached",
  },
  {
    id: "rabbitmq",
    text: "RabbitMQ provides asynchronous communication between microservices.",
    technology: "rabbitmq",
  },
  {
    id: "kafka",
    text: "Kafka streams events between services with high throughput and durable logs.",
    technology: "kafka",
  },
  {
    id: "postgres",
    text: "PostgreSQL connection pools reduce the cost of creating database connections.",
    technology: "postgres",
  },
  {
    id: "mysql",
    text: "MySQL replication lets read traffic scale across multiple database replicas.",
    technology: "mysql",
  },
  {
    id: "kubernetes",
    text: "Kubernetes automatically restarts failed containers.",
    technology: "kubernetes",
  },
  {
    id: "docker",
    text: "Docker packages an application and its dependencies into a portable container image.",
    technology: "docker",
  },
  {
    id: "nginx",
    text: "Nginx acts as a reverse proxy and load balancer in front of application servers.",
    technology: "nginx",
  },
  {
    id: "elasticsearch",
    text: "Elasticsearch indexes documents for fast full-text search across large datasets.",
    technology: "elasticsearch",
  },
  {
    id: "graphql",
    text: "GraphQL lets clients request exactly the fields they need in a single API call.",
    technology: "graphql",
  },
  {
    id: "terraform",
    text: "Terraform defines cloud infrastructure as code so environments can be reproduced reliably.",
    technology: "terraform",
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
