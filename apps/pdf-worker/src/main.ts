/**
 * The PDF worker (book-designer.md §9): takes builds from the queue on Valkey, one at a time,
 * and renders them with Typst. Runs in its own container, with Typst and the fonts
 * (infra/docker/pdf-worker).
 *
 * Environment: `VALKEY_URL`, `FONT_PATH` (default /fonts), and the file store's `STORAGE_*`
 * (packages/storage).
 */

import { PDF_QUEUE, type PdfJob, type PdfResult } from "@scripturetips/book";
import { s3Store, settingsFromEnv } from "@scripturetips/storage";
import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { build } from "./build.ts";

const valkeyUrl = process.env["VALKEY_URL"];
if (!valkeyUrl) throw new Error("VALKEY_URL is not set");
const store = s3Store(settingsFromEnv());
const settings = { fontPath: process.env["FONT_PATH"] ?? "/fonts" };

const worker = new Worker<PdfJob, PdfResult>(
  PDF_QUEUE,
  async (job) => {
    const started = performance.now();
    const result = await build(job.data, store, settings);
    console.log(
      `build ${job.data.buildId}: ${result.pages} pages in ${((performance.now() - started) / 1000).toFixed(1)} s`,
    );
    return result;
  },
  // A whole Bible takes about two minutes and most of a CPU: one build at a time per worker.
  {
    connection: new Redis(valkeyUrl, { maxRetriesPerRequest: null }),
    concurrency: 1,
    lockDuration: 60_000,
  },
);
worker.on("failed", (job, error) => console.error(`build ${job?.data.buildId} failed:`, error));
console.log(`pdf-worker: waiting for builds on ${PDF_QUEUE}`);

for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, async () => {
    await worker.close();
    process.exit(0);
  });
