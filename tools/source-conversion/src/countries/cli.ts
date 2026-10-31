/**
 * Generates the country codes from the pinned CLDR files.
 *
 *   node src/countries/cli.ts <source-texts directory> <output .ts file>
 *
 * The source-texts directory is `/source-texts` in the toolbox; the output is
 * `packages/countries/src/countries.generated.ts`.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CLDR, generate } from "./generate.ts";

const [sources, output] = process.argv.slice(2);
if (!sources || !output) {
  console.error("Usage: node src/countries/cli.ts <source-texts directory> <output .ts file>");
  process.exit(2);
}

const { module, report } = generate({
  info: readFileSync(join(sources, CLDR.info), "utf8"),
  containment: readFileSync(join(sources, CLDR.containment), "utf8"),
  license: readFileSync(join(sources, CLDR.license), "utf8"),
});
writeFileSync(output, module);
console.log(report);
