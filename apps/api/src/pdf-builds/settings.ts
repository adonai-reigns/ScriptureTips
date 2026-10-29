import { PDF_QUEUE, type PdfJob, type PdfResult } from "@scripturetips/book";
import { type FileStore, s3Store, settingsFromEnv } from "@scripturetips/storage";
import { Queue } from "bullmq";
import { Redis } from "ioredis";

/** Where a queued build stands; null when the queue no longer has it. */
export type JobState =
  | { readonly state: "waiting" | "active" }
  | { readonly state: "completed"; readonly result: PdfResult }
  | { readonly state: "failed"; readonly error: string };

/** The PDF build queue: BullMQ on Valkey in the stack, memory in tests. */
export interface PdfQueue {
  add(job: PdfJob): Promise<void>;
  state(buildId: string): Promise<JobState | null>;
  close(): Promise<void>;
}

/** What PDF builds need besides the database. Tests pass their own (memory store and queue). */
export interface BuildSettings {
  readonly store: FileStore;
  readonly queue: PdfQueue;
  /** Builds a user may request in 24 hours (vision §7.1, fair use). */
  readonly dailyLimit: number;
}

// A finished job is kept long enough for the API to read its result, then removed.
const KEEP = { age: 7 * 24 * 60 * 60 };

export function bullmqQueue(url: string): PdfQueue {
  const queue = new Queue<PdfJob, PdfResult>(PDF_QUEUE, {
    connection: new Redis(url, { maxRetriesPerRequest: null }),
  });
  return {
    async add(job) {
      await queue.add("build", job, {
        jobId: job.buildId,
        attempts: 1,
        removeOnComplete: KEEP,
        removeOnFail: KEEP,
      });
    },
    async state(buildId) {
      const job = await queue.getJob(buildId);
      if (!job) return null;
      const state = await job.getState();
      if (state === "completed") return { state, result: job.returnvalue };
      if (state === "failed") return { state, error: job.failedReason };
      return { state: state === "active" ? "active" : "waiting" };
    },
    async close() {
      await queue.close();
    },
  };
}

/** The queue in memory, for tests: `finish` and `fail` play the worker's part. */
export function memoryQueue() {
  const jobs = new Map<string, JobState>();
  const queue: PdfQueue & {
    readonly jobs: ReadonlyMap<string, JobState>;
    finish(buildId: string, result: PdfResult): void;
    fail(buildId: string, error: string): void;
    lose(buildId: string): void;
  } = {
    jobs,
    async add(job) {
      jobs.set(job.buildId, { state: "waiting" });
    },
    async state(buildId) {
      return jobs.get(buildId) ?? null;
    },
    async close() {},
    finish: (buildId, result) => jobs.set(buildId, { state: "completed", result }),
    fail: (buildId, error) => jobs.set(buildId, { state: "failed", error }),
    lose: (buildId) => jobs.delete(buildId),
  };
  return queue;
}

/**
 * From the environment: `VALKEY_URL`, the file store's `STORAGE_*` (packages/storage), and
 * `PDF_DAILY_BUILDS` (optional, default 10).
 */
export function buildSettingsFromEnv(): BuildSettings {
  const url = process.env["VALKEY_URL"];
  if (!url) throw new Error("VALKEY_URL isn't set (compose.yaml sets it for development)");
  return {
    store: s3Store(settingsFromEnv()),
    queue: bullmqQueue(url),
    dailyLimit: Number(process.env["PDF_DAILY_BUILDS"] ?? 10),
  };
}
