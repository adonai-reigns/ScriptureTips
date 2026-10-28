/**
 * Databases for integration tests (testing.md §10): each test file gets its own database on
 * the test server, cloned from a migrated template (made once per run by global-setup.ts),
 * so files run in parallel and start from an empty, migrated schema in milliseconds. Each run
 * has its own template (`TEST_TEMPLATE`), so packages can test at the same time.
 */

import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { connect, type Database } from "../client.ts";
import { migrate } from "../migrate.ts";

const template = () => {
  const name = process.env["TEST_TEMPLATE"];
  if (!name) throw new Error("TEST_TEMPLATE isn't set: add global-setup.ts to vitest.config.ts");
  return name;
};

/** The test server's admin URL, `TEST_DATABASE_URL` (set in the toolbox: compose.yaml). */
export function testServerUrl(): string {
  const url = process.env["TEST_DATABASE_URL"];
  if (!url) throw new Error("TEST_DATABASE_URL isn't set (it is in the toolbox: compose.yaml)");
  return url;
}

const withDatabase = (url: string, name: string) => {
  const u = new URL(url);
  u.pathname = `/${name}`;
  return u.toString();
};

/** A fresh database cloned from the template. Call `drop` when the tests are done. */
export async function testDatabase(): Promise<{ db: Database; drop: () => Promise<void> }> {
  const server = testServerUrl();
  const name = `test_${randomUUID().replaceAll("-", "")}`;
  const admin = postgres(server, { onnotice: () => {} });
  try {
    await admin.unsafe(`CREATE DATABASE ${name} TEMPLATE ${template()}`);
  } finally {
    await admin.end();
  }
  const { db, close } = connect(withDatabase(server, name));
  return {
    db,
    drop: async () => {
      await close();
      const cleanup = postgres(server, { onnotice: () => {} });
      try {
        await cleanup.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      } finally {
        await cleanup.end();
      }
    },
  };
}

/** Creates a template from the current migrations; returns its name and how to drop it. */
export async function createTemplate(): Promise<{ name: string; drop: () => Promise<void> }> {
  const server = testServerUrl();
  const name = `template_${randomUUID().replaceAll("-", "")}`;
  const admin = postgres(server, { onnotice: () => {} });
  try {
    await admin.unsafe(`CREATE DATABASE ${name}`);
  } finally {
    await admin.end();
  }
  const { db, close } = connect(withDatabase(server, name));
  try {
    await migrate(db);
  } finally {
    await close();
  }
  return {
    name,
    drop: async () => {
      const cleanup = postgres(server, { onnotice: () => {} });
      try {
        await cleanup.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      } finally {
        await cleanup.end();
      }
    },
  };
}
