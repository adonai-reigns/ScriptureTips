/**
 * Publications from the API (apps/api, domain-model §2.3), fetched on the server. Reading a
 * published version needs no account; the owner's view of their compilation's publication is
 * fetched with their session.
 */

import { cookies } from "next/headers";
import type { PassageResult, Source, Translation } from "../reader/api.ts";
import type { Attribution } from "../reader/attributions.tsx";

export interface VersionView {
  /** The version ID: in a pinned link, `/p/{handle}/{slug}/…/{id}`. */
  id: string;
  number: number;
  publishedAt: string;
  changeNote: string | null;
  changedVerses: number | null;
  verseCount: number;
  contentHash: string;
  previousHash: string | null;
}

export interface PublicationView {
  id: string;
  handle: string;
  slug: string;
  title: string;
  visibility: "unlisted" | "public";
  status: "active" | "withdrawn";
  versions: VersionView[];
}

/** What the reader is told about the publication and the version being read. */
export interface ReaderPublication {
  id: string;
  handle: string;
  slug: string;
  title: string;
  abbreviation: string;
  direction: "ltr" | "rtl";
  visibility: "unlisted" | "public";
  version: VersionView;
  /** The latest version, when it's public. */
  latest: { id: string; number: number } | null;
}

export type PublicationPassage =
  | {
      ok: true;
      translation: Translation;
      passages: PassageResult[];
      sources: Source[];
      /** What each source's text must carry, as the version was published. */
      attributions: Attribution[];
      publication: ReaderPublication;
    }
  | { ok: false; code: string; status: number };

const API = process.env["API_URL"] ?? "http://127.0.0.1:3001/api";

const path = (handle: string, slug: string) =>
  `${API}/publications/${encodeURIComponent(handle)}/${encodeURIComponent(slug)}`;
const versioned = (version: string | undefined) =>
  version ? `version=${encodeURIComponent(version)}` : "";

export async function publicationPassage(
  handle: string,
  slug: string,
  ref: string,
  version?: string,
): Promise<PublicationPassage> {
  try {
    const query = [`ref=${encodeURIComponent(ref)}`, versioned(version)].filter(Boolean).join("&");
    // Not cached: a pinned version never changes, but whether a newer one exists does.
    const res = await fetch(`${path(handle, slug)}/passages?${query}`, {
      cache: "no-store",
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (res.ok) return { ok: true, ...(body as Omit<PublicationPassage & { ok: true }, "ok">) };
    return {
      ok: false,
      status: res.status,
      code: typeof body["code"] === "string" ? body["code"] : "unavailable",
    };
  } catch {
    return { ok: false, status: 503, code: "unavailable" };
  }
}

/** A version's books and chapters, and the publication; null when it can't be read. */
export async function publicationBooks(
  handle: string,
  slug: string,
  version?: string,
): Promise<{
  books: { osis: string; chapters: number[] }[];
  publication: ReaderPublication;
} | null> {
  try {
    const query = versioned(version);
    const res = await fetch(`${path(handle, slug)}/books${query ? `?${query}` : ""}`, {
      cache: "no-store",
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

/** The signed-in owner's publication of a compilation; null if it hasn't been published. */
export async function myPublication(slug: string): Promise<PublicationView | null> {
  const cookie = (await cookies()).toString();
  if (!cookie) return null;
  try {
    const res = await fetch(`${API}/compilations/${encodeURIComponent(slug)}/publication`, {
      headers: { cookie },
      cache: "no-store",
    });
    return res.ok
      ? ((await res.json()) as { publication: PublicationView | null }).publication
      : null;
  } catch {
    return null;
  }
}

export type Problem =
  | { code: "pasted-verses"; verses: string[] }
  | {
      code: "unknown-license" | "modification-not-allowed" | "notes-excluded";
      source: string;
      verses?: number;
    }
  | { code: "name-restricted"; source: string; term: string }
  | { code: "slug-published" };

/** The pre-publish checks (domain-model §1.4, step 2). */
export interface PublishCheck {
  problems: Problem[];
  warnings: {
    code: "similar-wording";
    verses: { verse: string; source: string; score: number }[];
  }[];
  attributions: Attribution[];
  sources: {
    id: string;
    abbreviation: string;
    name: string;
    license: string;
    verses: number;
    share: number;
  }[];
  verses: number;
  own: number;
  corrected: number;
  adapted: number;
  /** The consent statement to show and send back: message `consent{n}`. */
  consent: number;
}

/** A publication's path: its latest version, or pinned to `version` (domain-model §1.6). */
export const publicationPath = (handle: string, slug: string, rest = "", version?: string) =>
  `/p/${handle}/${slug}${rest}${version ? `/${version}` : ""}`;
