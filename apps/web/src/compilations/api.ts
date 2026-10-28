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

export interface Compilation extends CompilationSummary {
  scheme: string;
  rules: Rule[];
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
