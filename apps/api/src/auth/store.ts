import { Redis } from "ioredis";

/** Counters and one-time markers that expire: Valkey in the stack, memory in tests. */
export interface KeyStore {
  /**
   * Adds one to `key`, which expires `ttl` seconds after its first count. Returns the new count
   * and the seconds left until it expires.
   */
  increment(key: string, ttl: number): Promise<{ count: number; expiresIn: number }>;
  /** Sets `key` for `ttl` seconds if it isn't set. True if this call set it. */
  claim(key: string, ttl: number): Promise<boolean>;
  close(): Promise<void>;
}

// One round trip, so concurrent requests can't all read a stale count.
const INCREMENT = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return {n, redis.call('TTL', KEYS[1])}`;

/** The store on Valkey (`VALKEY_URL`). */
export function valkeyStore(url: string): KeyStore {
  const valkey = new Redis(url, { maxRetriesPerRequest: 2 });
  return {
    async increment(key, ttl) {
      const [count, expiresIn] = (await valkey.eval(INCREMENT, 1, key, ttl)) as [number, number];
      return { count, expiresIn: Math.max(expiresIn, 0) };
    },
    async claim(key, ttl) {
      return (await valkey.set(key, "1", "EX", ttl, "NX")) === "OK";
    },
    async close() {
      await valkey.quit();
    },
  };
}

/** The store in memory, for tests. `now` gives the time in milliseconds. */
export function memoryStore(now: () => number = Date.now): KeyStore {
  const entries = new Map<string, { count: number; expires: number }>();
  const live = (key: string) => {
    const e = entries.get(key);
    if (e && e.expires <= now()) entries.delete(key);
    return entries.get(key);
  };
  return {
    async increment(key, ttl) {
      const e = live(key) ?? { count: 0, expires: now() + ttl * 1000 };
      e.count += 1;
      entries.set(key, e);
      return { count: e.count, expiresIn: Math.ceil((e.expires - now()) / 1000) };
    },
    async claim(key, ttl) {
      if (live(key)) return false;
      entries.set(key, { count: 1, expires: now() + ttl * 1000 });
      return true;
    },
    async close() {},
  };
}
