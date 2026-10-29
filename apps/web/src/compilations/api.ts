import { cookies } from "next/headers";

/** The signed-in user's compilations (apps/api `CompilationsController`). Server components only. */

export type RuleKind = "section" | "book" | "chapter" | "range";

export interface SourceView {
  id: string;
  abbreviation: string;
  name: string;
}

export interface Rule {
  id: string;
  kind: RuleKind;
  /** The section ID, or OSIS in the compilation's numbering. */
  entered: string;
  label: string;
  source: SourceView;
}

export interface CompilationSummary {
  /** The reader ID, `@handle/slug`. */
  id: string;
  slug: string;
  title: string;
  abbreviation: string;
  base: SourceView;
  language: string;
  direction: "ltr" | "rtl";
}

export type EditKind = "correction" | "adaptation";
/** The user's own wording: `pasted` until they declare it their own. */
export type Rendering = "own" | "pasted";

/** A single-verse choice (domain-model §2.3, CompilationVerse). */
export interface VerseChoice {
  id: string;
  /** OSIS in the compilation's numbering: "Gen.1.3". */
  entered: string;
  label: string;
  origin: "source" | "edited" | Rendering;
  editKind: EditKind | null;
  /** Null for the user's own wording. */
  source: SourceView | null;
  changeNote: string | null;
  /** An edited verse's source has changed since the edit. */
  sourceChanged: boolean;
}

export interface Compilation extends CompilationSummary {
  scheme: string;
  rules: Rule[];
  verses: VerseChoice[];
}

/** One verse as the compilation has it, and as each translation that may be taken has it. */
export interface VerseEditor {
  label: string;
  entered: string;
  current: {
    origin: VerseChoice["origin"];
    source: SourceView | null;
    edit: EditKind | null;
    text: string;
  };
  choice: VerseChoice | null;
  /** For the user's own wording: its authorship evidence (domain-model §2.3.1). */
  authorship: {
    sessions: number;
    events: number;
    externalPastes: number;
    verified: boolean;
    declaredAt: string | null;
    similarity: { translation: SourceView; score: number; matched: string[] }[];
  } | null;
  /** The version of the declaration statement to show (messages `statement{n}`). */
  statement: number;
  options: {
    translation: SourceView;
    text: string;
    modifiable: boolean;
    correctionLimit: number;
  }[];
}

const API = process.env["API_URL"] ?? "http://127.0.0.1:3001/api";

async function get<T>(path: string): Promise<T | null> {
  const cookie = (await cookies()).toString();
  if (!cookie) return null;
  try {
    const res = await fetch(`${API}/compilations${path}`, {
      headers: { cookie },
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

export async function myCompilations(): Promise<CompilationSummary[]> {
  return (await get<{ compilations: CompilationSummary[] }>(""))?.compilations ?? [];
}

export function myCompilation(slug: string): Promise<Compilation | null> {
  return get<Compilation>(`/${encodeURIComponent(slug)}`);
}

/** The verse editor's view of `ref`, or the API's error code for it. */
export async function verseEditor(
  slug: string,
  ref: string,
): Promise<{ ok: true; verse: VerseEditor } | { ok: false; code: string }> {
  const cookie = (await cookies()).toString();
  try {
    const res = await fetch(
      `${API}/compilations/${encodeURIComponent(slug)}/verses?ref=${encodeURIComponent(ref)}`,
      { headers: { cookie }, cache: "no-store" },
    );
    const body = (await res.json().catch(() => ({}))) as { code?: unknown };
    if (res.ok) return { ok: true, verse: body as VerseEditor };
    return { ok: false, code: typeof body.code === "string" ? body.code : "unavailable" };
  } catch {
    return { ok: false, code: "unavailable" };
  }
}
