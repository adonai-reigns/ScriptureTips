/**
 * Generates the versification package's mapping tables from STEPBible's TVTMS.
 *
 *   node src/tvtms/cli.ts <TVTMS .txt> <output directory>
 *
 * Writes one TypeScript module per scheme and `import-report.txt` (rows skipped, conflicts
 * resolved). The output directory is `packages/versification/src/data`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generate } from "./generate.ts";

const [input, outDir] = process.argv.slice(2);
if (!input || !outDir) {
  console.error("Usage: node src/tvtms/cli.ts <TVTMS .txt> <output directory>");
  process.exit(2);
}

for (const [name, content] of generate(readFileSync(input, "utf8"))) {
  writeFileSync(join(outDir, name), content);
  console.log(`wrote ${name}`);
}
