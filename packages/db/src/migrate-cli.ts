/** Migrates the development database: `pnpm --filter @scripturetips/db migrate`. */

import { connect, databaseUrl } from "./client.ts";
import { migrate } from "./migrate.ts";

const { db, close } = connect(databaseUrl());
try {
  await migrate(db);
  console.log("Migrated.");
} finally {
  await close();
}
