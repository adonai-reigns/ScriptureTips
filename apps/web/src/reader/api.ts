/**
 * The API's translations and passages (apps/api), fetched on the server. A compilation is read
 * like a translation by its reader ID, `@handle/slug` (paths.ts), with the viewer's session:
 * compilations are private to their owner.
 */

import { cookies } from "next/headers";

export type Inline =
  | string
  | { type: "char"; marker: string; content: Inline[]; attributes?: Record<string, string> }
  | { type: "span"; span: string; content: Inline[] }
  | { type: "block"; marker: string }
  | { type: "heading"; marker: string; content: Inline[] }
  | { type: "note"; position: number };

export interface Heading {
  marker: string;
  content: Inline[];
}

export interface Note {
  position: number;
  kind: "footnote" | "endnote" | "cross_reference";
  caller: string;
  category: string | null;
  span: string | null;
  body: Inline[];
}

export interface Verse {
  chapter: number;
  verse: number;
  to: number | null;
  published: string | null;
  canonical: string[];
  headings: Heading[];
  content: Inline[];
  notes: Note[];
  /** In a compilation: the translation this verse was taken from (catalog ID). */
  source?: string;
  /** In a compilation: the source's wording was corrected or adapted. */
  edit?: "correction" | "adaptation";
  /** In a compilation: the user's own wording (no source), `pasted` until declared. */
  rendering?: "own" | "pasted";
}

/** A translation a compilation's verses were taken from. */
export interface Source {
  id: string;
  abbreviation: string;
  name: string;
}

export interface PassageResult {
  entered: string;
  canonical: string | null;
  label: string;
  wholeChapters: boolean;
  verses: Verse[];
}

export interface Translation {
  id: string;
  abbreviation: string;
  name: string;
  language: string;
  direction: "ltr" | "rtl";
  scheme: string;
  license: string;
}

export type PassageResponse =
  | { ok: true; translation: Translation; passages: PassageResult[]; sources?: Source[] }
  | { ok: false; code: string; index?: number };

/** `API_URL`: the API inside the dev stack (compose.yaml), or the local one. */
const API = process.env["API_URL"] ?? "http://127.0.0.1:3001/api";

export async function translations(): Promise<Translation[]> {
  const res = await fetch(`${API}/translations`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`API: ${res.status}`);
  return ((await res.json()) as { translations: Translation[] }).translations;
}

/** A compilation's API path, from its reader ID (`@handle/slug`). */
const compilationPath = (id: string) =>
  `${API}/compilations/${encodeURIComponent(id.split("/")[1] ?? "")}`;

/** A request for a translation (cached) or a compilation (the viewer's own, never cached). */
async function request(id: string, path: string): Promise<Response> {
  if (!id.startsWith("@"))
    return fetch(`${API}/translations/${encodeURIComponent(id)}${path}`, {
      next: { revalidate: 300 },
    });
  const cookie = (await cookies()).toString();
  return fetch(`${compilationPath(id)}${path}`, { headers: { cookie }, cache: "no-store" });
}

export async function passage(translation: string, ref: string): Promise<PassageResponse> {
  let res: Response;
  try {
    res = await request(translation, `/passages?ref=${encodeURIComponent(ref)}`);
  } catch {
    return { ok: false, code: "unavailable" };
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (res.ok)
    return {
      ok: true,
      ...(body as { translation: Translation; passages: PassageResult[]; sources?: Source[] }),
    };
  const code = typeof body["code"] === "string" ? body["code"] : "unavailable";
  return {
    ok: false,
    code,
    ...(typeof body["index"] === "number" ? { index: body["index"] } : {}),
  };
}

/** The books a translation has text for, with their chapters; null for an unknown translation. */
export async function books(
  translation: string,
): Promise<{ osis: string; chapters: number[] }[] | null> {
  const res = await request(translation, "/books");
  if (res.status === 404 || res.status === 401) return null;
  if (!res.ok) throw new Error(`API: ${res.status}`);
  return ((await res.json()) as { books: { osis: string; chapters: number[] }[] }).books;
}
