// Worker runner — starts all Bull queue processors.
// Run with: npm run workers (or npx tsx -r tsconfig-paths/register src/workers/start.ts)

import "dotenv/config";
import { startAllWorkers, stopAllWorkers } from "./pipeline";

async function main() {
  console.log("[worker-runner] Starting all workers...");
  await startAllWorkers();
  console.log("[worker-runner] All workers running. Press Ctrl+C to stop.");
}

process.on("SIGINT", async () => {
  console.log("\n[worker-runner] Shutting down...");
  await stopAllWorkers();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n[worker-runner] Shutting down...");
  await stopAllWorkers();
  process.exit(0);
});

main().catch((err) => {
  console.error("[worker-runner] Fatal error:", err);
  process.exit(1);
});
