/**
 * Generates the API's table of generally reserved handles from the pinned lists.
 *
 *   node src/reserved-names/cli.ts <source-texts directory> <output .ts file>
 *
 * The source-texts directory is `/source-texts` in the toolbox; the output is
 * `apps/api/src/auth/reserved-names.generated.ts`. Prints what was left out.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generate, LISTS } from "./generate.ts";

const [sources, output] = process.argv.slice(2);
if (!sources || !output) {
  console.error("Usage: node src/reserved-names/cli.ts <source-texts directory> <output .ts file>");
  process.exit(2);
}

const { module, report } = generate(
  LISTS.map((l) => ({
    ...l,
    text: readFileSync(join(sources, l.file), "utf8"),
    license: readFileSync(join(sources, l.licenseFile), "utf8"),
  })),
);
writeFileSync(output, module);
console.log(report);
