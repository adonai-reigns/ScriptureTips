/**
 * The file store (vision §7): S3-compatible storage, Garage in development. Everything that keeps
 * files goes through `FileStore`, which uses only the S3 operations every provider supports
 * (put, get, list, delete), so moving to a cloud provider is a configuration change. The contract
 * test (`store.test.ts`) runs each operation against the real server.
 */

import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export interface StoredFile {
  readonly contentType: string;
  readonly size: number;
  readonly body: Uint8Array;
}

export interface FileStore {
  put(key: string, body: Uint8Array | string, contentType: string): Promise<void>;
  /** The file, or null if there is none at `key`. */
  get(key: string): Promise<StoredFile | null>;
  /** The keys under `prefix`, in key order. */
  list(prefix: string): Promise<string[]>;
  /** Deletes every file under `prefix`. */
  removeAll(prefix: string): Promise<void>;
}

export interface S3Settings {
  readonly endpoint: string;
  readonly region: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly bucket: string;
  /** Bucket in the path (`host/bucket/key`) rather than the host name; Garage in development. */
  readonly pathStyle: boolean;
}

/**
 * Settings from the environment: `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY`,
 * `STORAGE_SECRET_KEY`, `STORAGE_BUCKET`, and `STORAGE_PATH_STYLE` (`true` unless `false`).
 */
export function settingsFromEnv(env: NodeJS.ProcessEnv = process.env): S3Settings {
  const required = (name: string) => {
    const value = env[name];
    if (!value) throw new Error(`${name} is not set`);
    return value;
  };
  return {
    endpoint: required("STORAGE_ENDPOINT"),
    region: env["STORAGE_REGION"] ?? "garage",
    accessKeyId: required("STORAGE_ACCESS_KEY"),
    secretAccessKey: required("STORAGE_SECRET_KEY"),
    bucket: required("STORAGE_BUCKET"),
    pathStyle: env["STORAGE_PATH_STYLE"] !== "false",
  };
}

export function s3Store(settings: S3Settings): FileStore {
  const client = new S3Client({
    endpoint: settings.endpoint,
    region: settings.region,
    forcePathStyle: settings.pathStyle,
    credentials: {
      accessKeyId: settings.accessKeyId,
      secretAccessKey: settings.secretAccessKey,
    },
  });
  const Bucket = settings.bucket;
  const list = async (prefix: string) => {
    const keys: string[] = [];
    let ContinuationToken: string | undefined;
    do {
      const page = await client.send(
        new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken }),
      );
      for (const o of page.Contents ?? []) if (o.Key) keys.push(o.Key);
      ContinuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (ContinuationToken);
    return keys.sort();
  };
  return {
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }),
      );
    },
    async get(key) {
      try {
        const object = await client.send(new GetObjectCommand({ Bucket, Key: key }));
        const body = (await object.Body?.transformToByteArray()) ?? new Uint8Array();
        return {
          contentType: object.ContentType ?? "application/octet-stream",
          size: body.byteLength,
          body,
        };
      } catch (error) {
        if (error instanceof NoSuchKey) return null;
        throw error;
      }
    },
    list,
    async removeAll(prefix) {
      const keys = await list(prefix);
      // At most 1,000 keys per request, the S3 limit.
      for (let i = 0; i < keys.length; i += 1000)
        await client.send(
          new DeleteObjectsCommand({
            Bucket,
            Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true },
          }),
        );
    },
  };
}

/** The store in memory, for tests. */
export function memoryStore(): FileStore {
  const files = new Map<string, StoredFile>();
  const list = async (prefix: string) =>
    [...files.keys()].filter((k) => k.startsWith(prefix)).sort();
  return {
    async put(key, body, contentType) {
      const bytes = typeof body === "string" ? new TextEncoder().encode(body) : body.slice();
      files.set(key, { contentType, size: bytes.byteLength, body: bytes });
    },
    async get(key) {
      return files.get(key) ?? null;
    },
    list,
    async removeAll(prefix) {
      for (const k of await list(prefix)) files.delete(k);
    },
  };
}
