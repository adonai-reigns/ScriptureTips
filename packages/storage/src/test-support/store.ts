import { randomUUID } from "node:crypto";
import { type FileStore, s3Store } from "../index.ts";

/**
 * The test Garage (see `global-setup.ts`), and a prefix of its own for each caller, so test files
 * running in parallel never see each other's files.
 */
export function testStore(): { store: FileStore; prefix: string } {
  const env = (name: string) => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is not set: run the tests through ./toolbox`);
    return value;
  };
  const store = s3Store({
    endpoint: env("TEST_STORAGE_ENDPOINT"),
    region: "garage",
    accessKeyId: env("TEST_STORAGE_ACCESS_KEY"),
    secretAccessKey: env("TEST_STORAGE_SECRET_KEY"),
    bucket: env("TEST_STORAGE_BUCKET"),
    pathStyle: true,
  });
  return { store, prefix: `test-${randomUUID()}/` };
}
