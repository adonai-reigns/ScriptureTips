/**
 * Sets up the development Garage (compose.yaml's `garage-init`): its node role, the app's access
 * key and bucket. Safe to run again.
 *
 * Environment: `GARAGE_ADMIN_URL`, `GARAGE_ADMIN_TOKEN`, `STORAGE_ACCESS_KEY`,
 * `STORAGE_SECRET_KEY`, `STORAGE_BUCKET`.
 */

import { setUpGarage } from "../../packages/storage/src/garage.ts";

const env = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
};

await setUpGarage(
  {
    adminUrl: env("GARAGE_ADMIN_URL"),
    adminToken: env("GARAGE_ADMIN_TOKEN"),
    accessKeyId: env("STORAGE_ACCESS_KEY"),
    secretAccessKey: env("STORAGE_SECRET_KEY"),
    bucket: env("STORAGE_BUCKET"),
  },
  console.log,
);
console.log("garage: ready");
