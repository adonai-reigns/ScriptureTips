import { setUpGarage } from "../garage.ts";

/**
 * Vitest global setup for tests that use the file store: sets up the test Garage
 * (`garage-test`, which starts with the toolbox and keeps its data in memory). Its settings come
 * from `TEST_GARAGE_ADMIN_URL`, `TEST_GARAGE_ADMIN_TOKEN` and the `TEST_STORAGE_*` variables
 * (compose.yaml); `testStoreSettings()` reads the same.
 */
export default async function setup(): Promise<void> {
  const env = (name: string) => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is not set: run the tests through ./toolbox`);
    return value;
  };
  await setUpGarage({
    adminUrl: env("TEST_GARAGE_ADMIN_URL"),
    adminToken: env("TEST_GARAGE_ADMIN_TOKEN"),
    accessKeyId: env("TEST_STORAGE_ACCESS_KEY"),
    secretAccessKey: env("TEST_STORAGE_SECRET_KEY"),
    bucket: env("TEST_STORAGE_BUCKET"),
  });
}
