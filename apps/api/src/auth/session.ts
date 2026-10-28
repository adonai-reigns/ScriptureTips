import { UnauthorizedException } from "@nestjs/common";
import { eq, user } from "@scripturetips/db";
import type { Database } from "../database.ts";
import type { Auth } from "./auth.ts";
import { fetchHeaders } from "./tokens.ts";

export type User = typeof user.$inferSelect;

/** The user whose session cookie came with the request; 401 `signed-out` otherwise. */
export async function signedInUser(
  auth: Auth,
  db: Database,
  headers: Record<string, string>,
): Promise<User> {
  const found = await auth.api.getSession({ headers: fetchHeaders(headers) });
  if (!found) throw new UnauthorizedException({ code: "signed-out" });
  const [row] = await db.select().from(user).where(eq(user.id, found.user.id));
  if (!row) throw new UnauthorizedException({ code: "signed-out" });
  return row;
}
