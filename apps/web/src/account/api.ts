import { cookies } from "next/headers";

/** The signed-in user's account, from the API (apps/api/src/auth). */
export interface Account {
  email: string;
  handle: string | null;
  name: string;
  locale: string;
  trustLevel: number;
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
