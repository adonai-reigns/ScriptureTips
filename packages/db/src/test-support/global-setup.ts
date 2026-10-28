import { createTemplate } from "./database.ts";

/**
 * Vitest global setup for integration tests: migrates this run's template, which the test
 * databases are cloned from (`TEST_TEMPLATE`, inherited by the test workers), and drops it
 * after the run.
 */
export default async function setup(): Promise<() => Promise<void>> {
  const template = await createTemplate();
  process.env["TEST_TEMPLATE"] = template.name;
  return template.drop;
}
