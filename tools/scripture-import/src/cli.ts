/**
 * Imports the catalog's translations from source-texts, several at a time.
 *
 *   node src/cli.ts [--jobs N] <source-texts folder> <output folder> [translation id …]
 *
 * Writes `<id>.json` per translation (books, verses with canonical refs, verse counts) and
 * `import-report.txt`. Exits with status 1 if any translation has issues. The output stays
 * outside git; it's loaded into the database once the database exists.
 *
 * Each translation runs in its own process (worker.ts). A heavy one (Strong's numbers on
 * every word) peaks near 4.5 GB, so by default as many run at once as available memory
 * allows at 5 GB each, up to the number of CPUs.
 */

import { fork } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { availableParallelism, freemem } from "node:os";
import { join } from "node:path";
import { CATALOG, NOT_IMPORTED } from "./catalog.ts";
import type { WorkerResult } from "./worker.ts";

const PEAK_MEMORY = 5 * 1024 ** 3;

const args = process.argv.slice(2);
const jobsFlag = args.indexOf("--jobs");
const requestedJobs = jobsFlag >= 0 ? Number(args.splice(jobsFlag, 2)[1]) : undefined;
const [sourceRoot, outDir, ...ids] = args;
if (!sourceRoot || !outDir || (requestedJobs !== undefined && !(requestedJobs >= 1))) {
  console.error(
    "Usage: node src/cli.ts [--jobs N] <source-texts folder> <output folder> [translation id …]",
  );
  process.exit(2);
}
const unknown = ids.filter((id) => !CATALOG.some((e) => e.id === id));
if (unknown.length > 0) {
  console.error(`Not in the catalog: ${unknown.join(", ")}`);
  process.exit(2);
}

// A held translation is imported only when asked for by ID, to work on it.
const entries = CATALOG.filter((e) => (ids.length === 0 ? !e.held : ids.includes(e.id)));
const jobs = Math.min(
  entries.length,
  requestedJobs ??
    Math.max(1, Math.min(availableParallelism(), Math.floor(freemem() / PEAK_MEMORY))),
);
mkdirSync(outDir, { recursive: true });
console.log(`Importing ${entries.length} translations, ${jobs} at a time`);

function run(id: string): Promise<WorkerResult> {
  return new Promise((resolve, reject) => {
    let result: WorkerResult | undefined;
    const worker = fork(join(import.meta.dirname, "worker.ts"), [
      sourceRoot ?? "",
      outDir ?? "",
      id,
    ]);
    worker.on("message", (message) => {
      result = message as WorkerResult;
    });
    worker.on("error", reject);
    worker.on("exit", (code, signal) => {
      if (result && code === 0) resolve(result);
      else reject(new Error(`${id}: the import process failed (${signal ?? `exit ${code}`})`));
    });
  });
}

const results = new Map<string, WorkerResult | Error>();
const queue = entries.map((e) => e.id);
await Promise.all(
  Array.from({ length: jobs }, async () => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      const result = await run(id).catch((error: Error) => error);
      results.set(id, result);
      console.log(result instanceof Error ? result.message : result.summary);
    }
  }),
);

const report: string[] = ["Scripture import", ""];
let failed = false;
for (const entry of entries) {
  const result = results.get(entry.id);
  if (!result || result instanceof Error) {
    report.push(`${entry.id}: ${result?.message ?? "not run"}`, "");
    failed = true;
    continue;
  }
  report.push(...result.report, "");
  if (result.issues > 0) failed = true;
}
if (ids.length === 0) {
  report.push("Held but not imported:");
  for (const e of CATALOG.filter((e) => e.held)) report.push(`  ${e.id}: ${e.held}`);
  for (const [file, reason] of Object.entries(NOT_IMPORTED)) report.push(`  ${file}: ${reason}`);
}
writeFileSync(join(outDir, "import-report.txt"), `${report.join("\n")}\n`);
process.exit(failed ? 1 : 0);
