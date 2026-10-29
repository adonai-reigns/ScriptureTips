/**
 * Runs one PDF build: reads its `book.json` from the file store, renders it, and stores the PDFs
 * and the Typst sources beside it (packages/book `BUILD_FILES`).
 */

import { BUILD_FILES, buildPrefix, type PdfJob, type PdfResult } from "@scripturetips/book";
import type { FileStore } from "@scripturetips/storage";
import { type RenderSettings, render } from "./render.ts";

export async function build(
  job: PdfJob,
  store: FileStore,
  settings: RenderSettings,
): Promise<PdfResult> {
  const prefix = buildPrefix(job.buildId);
  const description = await store.get(`${prefix}book.json`);
  if (!description) throw new Error(`build ${job.buildId} has no book.json`);
  const out = await render(new TextDecoder().decode(description.body), settings);
  await store.put(`${prefix}book.pdf`, out.book, BUILD_FILES["book.pdf"]);
  await store.put(`${prefix}cover.pdf`, out.cover, BUILD_FILES["cover.pdf"]);
  for (const [name, text] of Object.entries(out.sources))
    await store.put(`${prefix}${name}`, text, BUILD_FILES["book.typ"]);
  return { pages: out.pages, spine: out.spine };
}
