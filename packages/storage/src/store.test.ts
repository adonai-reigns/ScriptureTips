import { describe, expect, it } from "vitest";
import { type FileStore, memoryStore } from "./index.ts";
import { testStore } from "./test-support/store.ts";

/**
 * The contract every file store keeps: the S3 operations the app relies on, run against the real
 * server (Garage) and the memory store the unit tests use, so both behave alike. Point it at
 * another provider to check that provider before moving to it.
 */
const stores: [string, () => { store: FileStore; prefix: string }][] = [
  ["Garage (S3)", testStore],
  ["memory", () => ({ store: memoryStore(), prefix: "test/" })],
];

describe.each(stores)("file store contract: %s", (_name, make) => {
  it("keeps a file with its content type and size", async () => {
    const { store, prefix } = make();
    await store.put(`${prefix}a.json`, '{"a":1}', "application/json");
    const bytes = new Uint8Array([37, 80, 68, 70, 0, 255]);
    await store.put(`${prefix}b.pdf`, bytes, "application/pdf");

    const json = await store.get(`${prefix}a.json`);
    expect(json?.contentType).toBe("application/json");
    expect(new TextDecoder().decode(json?.body)).toBe('{"a":1}');
    const pdf = await store.get(`${prefix}b.pdf`);
    expect(pdf).toMatchObject({ contentType: "application/pdf", size: 6 });
    expect([...(pdf?.body ?? [])]).toEqual([...bytes]);
  });

  it("gives null for a file that isn't there", async () => {
    const { store, prefix } = make();
    expect(await store.get(`${prefix}missing.pdf`)).toBeNull();
  });

  it("replaces a file put again at the same key", async () => {
    const { store, prefix } = make();
    await store.put(`${prefix}a.txt`, "one", "text/plain");
    await store.put(`${prefix}a.txt`, "two", "text/plain");
    expect(new TextDecoder().decode((await store.get(`${prefix}a.txt`))?.body)).toBe("two");
  });

  it("lists and deletes the files under a prefix, and only those", async () => {
    const { store, prefix } = make();
    for (const k of ["b/2.txt", "b/1.txt", "c/1.txt"])
      await store.put(`${prefix}${k}`, k, "text/plain");
    expect(await store.list(`${prefix}b/`)).toEqual([`${prefix}b/1.txt`, `${prefix}b/2.txt`]);

    await store.removeAll(`${prefix}b/`);
    expect(await store.list(`${prefix}b/`)).toEqual([]);
    expect(await store.list(prefix)).toEqual([`${prefix}c/1.txt`]);
  });

  it("keeps a multi-megabyte file, as a whole Bible PDF is", async () => {
    const { store, prefix } = make();
    const big = new Uint8Array(12 * 1024 * 1024).map((_, i) => i % 251);
    await store.put(`${prefix}big.pdf`, big, "application/pdf");
    const back = await store.get(`${prefix}big.pdf`);
    expect(back?.size).toBe(big.byteLength);
    expect(back?.body[big.byteLength - 1]).toBe(big[big.byteLength - 1]);
  });
});
