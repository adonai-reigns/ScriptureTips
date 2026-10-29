/**
 * A PDF build (book-designer.md §8, `EditionBuild`): the API describes the book and stores its
 * `book.json`, then queues the build; the PDF worker (apps/pdf-worker) renders it and stores the
 * PDFs and the Typst sources beside it. Every file is kept, so a build can be downloaded whole
 * and compiled again as it was.
 */

/** The BullMQ queue PDF builds wait in. */
export const PDF_QUEUE = "pdf-builds";

/** A queued build: its files are under `buildPrefix(buildId)`. */
export interface PdfJob {
  readonly buildId: string;
}

/** What the worker reports for a finished build. */
export interface PdfResult {
  readonly pages: number;
  /** Spine width for the cover, in mm. */
  readonly spine: number;
}

/** A build's files, by name, with their content types. */
export const BUILD_FILES = {
  "book.pdf": "application/pdf",
  "cover.pdf": "application/pdf",
  "book.json": "application/json",
  "book.typ": "text/plain; charset=utf-8",
  "cover.typ": "text/plain; charset=utf-8",
} as const;

export type BuildFile = keyof typeof BUILD_FILES;

export const isBuildFile = (name: string): name is BuildFile => Object.hasOwn(BUILD_FILES, name);

export const buildPrefix = (buildId: string) => `pdf-builds/${buildId}/`;
