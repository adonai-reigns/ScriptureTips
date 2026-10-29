/**
 * Runs the PDF engine trial (book-designer.md §9): describes the sample book once, then renders
 * it with each engine, timing each and counting its pages, and makes each engine's cover with
 * the spine width that page count gives.
 *
 *   pnpm --filter @scripturetips/pdf-trial trial [typst|latex] [--whole]
 *
 * `--whole` also times a whole Bible (the LEB) in the same layout. Output goes to `.work/`.
 */

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Book } from "./book.ts";
import { describe, mapSvg, wholeBible } from "./describe.ts";
import { LUA, renderLatex } from "./latex.ts";

const WORK = new URL("../.work/", import.meta.url).pathname;
const TEMPLATES = new URL("../templates/", import.meta.url).pathname;
const SOURCES = process.env["SOURCE_TEXTS"] ?? "/source-texts";

const run = (cmd: string, args: string[], cwd: string) =>
  execFileSync(cmd, args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 1 << 28,
  }).toString();

/** The trial fonts, extracted from the downloads recorded in docs/license-evidence. */
function fonts(): string {
  const dir = join(WORK, "fonts");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    run("unzip", ["-j", "-q", `${SOURCES}/gentium/Gentium-7.000.zip`, "*.ttf", "-d", dir], WORK);
    run("unzip", ["-j", "-q", `${SOURCES}/ezra-sil/EzraSIL-2.51.zip`, "*.ttf", "-d", dir], WORK);
  }
  return dir;
}

const pages = (pdf: string) =>
  Number(/Pages:\s+(\d+)/.exec(run("pdfinfo", [pdf], WORK))?.[1] ?? Number.NaN);

function timed<T>(label: string, action: () => T): T {
  const start = performance.now();
  const result = action();
  console.log(`${label}: ${((performance.now() - start) / 1000).toFixed(1)} s`);
  return result;
}

function prepare(dir: string, book: Book) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "book.json"), JSON.stringify(book));
  const f = book.format;
  writeFileSync(join(dir, "map.svg"), mapSvg(2 * f.width + 2 * f.bleed, f.height + 2 * f.bleed));
}

function typst(dir: string, book: Book, name: string) {
  cpSync(join(TEMPLATES, "book.typ"), join(dir, "book.typ"));
  cpSync(join(TEMPLATES, "cover.typ"), join(dir, "cover.typ"));
  const fontPath = ["--font-path", fonts(), "--ignore-system-fonts"];
  timed(`typst ${name}`, () =>
    run("typst", ["compile", ...fontPath, "book.typ", `${name}.pdf`], dir),
  );
  const count = pages(join(dir, `${name}.pdf`));
  const f = book.format;
  run(
    "typst",
    ["compile", ...fontPath, "--input", `pages=${count}`, "cover.typ", `${name}-cover.pdf`],
    dir,
  );
  console.log(`typst ${name}: ${count} pages, spine ${(count * f.caliper).toFixed(1)} mm`);
}

function latex(dir: string, book: Book, name: string) {
  writeFileSync(join(dir, `${name}.tex`), renderLatex(book, fonts()));
  writeFileSync(join(dir, "trial.lua"), LUA);
  rmSync(join(dir, "cnotes.pos"), { force: true });
  // The map as a PDF for LuaLaTeX, which can't place SVG; made with Typst from the same file.
  cpSync(join(TEMPLATES, "map.typ"), join(dir, "map.typ"));
  run(
    "typst",
    [
      "compile",
      "--input",
      `w=${2 * book.format.width + 2 * book.format.bleed}`,
      "--input",
      `h=${book.format.height + 2 * book.format.bleed}`,
      "map.typ",
      "map.pdf",
    ],
    dir,
  );
  // Two passes: the first records each note's position and the page ranges, the second uses them.
  timed(`lualatex ${name} (2 passes)`, () => {
    for (let i = 0; i < 2; i++)
      run("lualatex", ["-interaction=nonstopmode", "-halt-on-error", `${name}.tex`], dir);
  });
  const count = pages(join(dir, `${name}.pdf`));
  writeFileSync(join(dir, `${name}-cover.tex`), renderLatex(book, fonts(), count));
  run("lualatex", ["-interaction=nonstopmode", "-halt-on-error", `${name}-cover.tex`], dir);
  console.log(
    `lualatex ${name}: ${count} pages, spine ${(count * book.format.caliper).toFixed(1)} mm`,
  );
}

const engines = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const use = (e: string) => engines.length === 0 || engines.includes(e);

const sample = await describe();
if (use("typst")) {
  prepare(join(WORK, "typst"), sample);
  typst(join(WORK, "typst"), sample, "sample");
}
if (use("latex")) {
  prepare(join(WORK, "latex"), sample);
  latex(join(WORK, "latex"), sample, "sample");
}
if (process.argv.includes("--whole")) {
  const whole = await wholeBible();
  if (use("typst")) {
    prepare(join(WORK, "typst"), whole);
    typst(join(WORK, "typst"), whole, "whole");
  }
  if (use("latex")) {
    prepare(join(WORK, "latex"), whole);
    latex(join(WORK, "latex"), whole, "whole");
  }
}
