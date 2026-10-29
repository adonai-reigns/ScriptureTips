import { memoryStore } from "@scripturetips/storage";
import { type BuildSettings, memoryQueue } from "./settings.ts";

/** PDF build settings for tests: a memory file store, and a queue the test finishes jobs on. */
export function testBuilds(dailyLimit = 10) {
  const store = memoryStore();
  const queue = memoryQueue();
  const settings: BuildSettings = { store, queue, dailyLimit };
  return { settings, store, queue };
}
