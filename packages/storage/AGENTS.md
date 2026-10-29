# @scripturetips/storage

The file store (vision §7): S3-compatible storage, **Garage** in development and tests (MinIO no longer publishes images). Everything that keeps files goes through `FileStore`.

- **Only the core S3 operations** every provider supports: put, get, list, delete (`DeleteObjects`). Moving to a cloud provider is a configuration change (`STORAGE_ENDPOINT`, `STORAGE_REGION`, keys, bucket, `STORAGE_PATH_STYLE`). Before relying on any other operation (presigned links, lifecycle expiry), check Garage's support for it ([S3 compatibility](https://garagehq.deuxfleurs.fr/documentation/reference-manual/s3-compatibility/)), add it to the contract test, and tell the project owner if it's missing.
- **Contract test** (`store.test.ts`): each operation against the real Garage and the memory store, so both behave alike. Point it at another provider to check that provider before moving.
- `s3Store(settings)` (`settingsFromEnv()`), `memoryStore()` for unit tests.
- `setUpGarage()` (`./garage`): gives a fresh single-node Garage its storage role, the app's key and bucket, through the admin API. Run by `infra/garage/init.ts` (compose `garage-init`) and by the tests' global setup.
- **Tests:** `garage-test` starts with the toolbox (in memory). Add `@scripturetips/storage/test-support/global-setup` to `vitest.config.ts`; `testStore()` gives each caller its own key prefix.

Run the tests: `./toolbox pnpm --filter @scripturetips/storage test`
