import type { CanonId } from "@scripturetips/canon";
import { cookies } from "next/headers";

/** The signed-in user's account, from the API (apps/api/src/auth). */
export interface Account {
  email: string;
  handle: string | null;
  name: string;
  locale: string;
  canon: CanonId | null;
  trustLevel: number;
  /** A country code (`@scripturetips/countries`), or null. */
  country: string | null;
  /** `female`, `male`, `both`, or null. */
  gender: string | null;
  /** An age bracket, or null. */
  ageBracket: string | null;
  /** What they wrote when their country wasn't listed, awaiting review; only they see it. */
  countryClaim: string | null;
  /** Translation catalog IDs, in the order they favor them (see `menuTranslations`). */
  favoriteTranslations: string[];
  /** The order they gave the rest. */
  otherTranslations: string[];
  /** Menus list only the favorites. */
  favoritesOnly: boolean;
}

const API = process.env["API_URL"] ?? "http://127.0.0.1:3001/api";

/** The account of whoever is viewing, or null when signed out. Server components only. */
export async function currentAccount(): Promise<Account | null> {
  const cookie = (await cookies()).toString();
  if (!cookie) return null;
  try {
    const res = await fetch(`${API}/account`, { headers: { cookie }, cache: "no-store" });
    return res.ok ? ((await res.json()) as Account) : null;
  } catch {
    return null;
  }
}
