import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";

export type Database = ReturnType<typeof drizzle<typeof schema>>;

/** A connection pool and its Drizzle handle. Call `close` when done. */
export function connect(url: string): { db: Database; close: () => Promise<void> } {
  const client = postgres(url, { onnotice: () => {} });
  return { db: drizzle(client, { schema }), close: () => client.end() };
}

/** `DATABASE_URL`, set in the toolbox (compose.yaml). */
export function databaseUrl(): string {
  const url = process.env["DATABASE_URL"];
  if (!url) throw new Error("DATABASE_URL isn't set (it is in the toolbox: compose.yaml)");
  return url;
}
