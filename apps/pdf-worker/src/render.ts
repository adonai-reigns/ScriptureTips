/**
 * Renders a book description to PDF with Typst (book-designer.md §9): the interior first, then
 * the cover, whose spine width comes from the interior's page count. Each build runs in a fresh
 * temporary directory holding only its `book.json` and the templates.
 */

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { type Book, TEMPLATES, templatePath } from "@scripturetips/book";

const run = promisify(execFile);

export interface Rendered {
  readonly book: Uint8Array;
  readonly cover: Uint8Array;
  readonly pages: number;
  /** In mm. */
  readonly spine: number;
  /** The templates as compiled, to store with the build. */
  readonly sources: Readonly<Record<(typeof TEMPLATES)[number], string>>;
}

export interface RenderSettings {
  /** Where the fonts are (`FONT_PATH`); only these are used, never the system's. */
  readonly fontPath: string;
}

export async function render(bookJson: string, settings: RenderSettings): Promise<Rendered> {
  const book = JSON.parse(bookJson) as Book;
  const dir = await mkdtemp(join(tmpdir(), "pdf-build-"));
  try {
    await writeFile(join(dir, "book.json"), bookJson);
    const sources = {} as Record<(typeof TEMPLATES)[number], string>;
    for (const name of TEMPLATES) {
      sources[name] = await readFile(templatePath(name), "utf8");
      await writeFile(join(dir, name), sources[name]);
    }
    const typst = (args: string[]) =>
      run(
        "typst",
        ["compile", "--font-path", settings.fontPath, "--ignore-system-fonts", ...args],
        { cwd: dir, maxBuffer: 1 << 24 },
      );
    await typst(["book.typ", "book.pdf"]);
    const info = await run("pdfinfo", ["book.pdf"], { cwd: dir });
    const pages = Number(/^Pages:\s+(\d+)/m.exec(info.stdout)?.[1]);
    if (!Number.isInteger(pages)) throw new Error(`no page count from pdfinfo: ${info.stdout}`);
    await typst(["--input", `pages=${pages}`, "cover.typ", "cover.pdf"]);
    return {
      book: await readFile(join(dir, "book.pdf")),
      cover: await readFile(join(dir, "cover.pdf")),
      pages,
      spine: Math.round(pages * book.format.caliper * 10) / 10,
      sources,
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
