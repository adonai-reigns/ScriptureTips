/**
 * Sets up a fresh single-node Garage (infra/garage/garage.toml) through its admin API (v2): gives
 * the node its storage role, imports the app's access key, and creates a bucket the key may use.
 * Safe to run again: each step is skipped when it's done. Used by `infra/garage/init.ts` for the
 * development store and by the tests' global setup for the test store.
 */

export interface GarageSetup {
  /** The admin API, e.g. http://garage:3903. */
  readonly adminUrl: string;
  readonly adminToken: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly bucket: string;
}

export async function setUpGarage(g: GarageSetup, log: (line: string) => void = () => {}) {
  const request = (method: "GET" | "POST", path: string, body?: unknown) =>
    fetch(`${g.adminUrl}/v2/${path}`, {
      method,
      headers: { authorization: `Bearer ${g.adminToken}`, "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  const call = async <T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> => {
    const response = await request(method, path, body);
    if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
    return (await response.json()) as T;
  };
  /** A key or bucket, or null if there's none (the admin API answers 404). */
  const find = async <T>(path: string): Promise<T | null> => {
    const response = await request("GET", path);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
    return (await response.json()) as T;
  };

  const status = await call<{ nodes: { id: string; role: unknown }[] }>("GET", "GetClusterStatus");
  const node = status.nodes[0];
  if (!node) throw new Error("Garage reports no node");
  if (!node.role) {
    await call("POST", "UpdateClusterLayout", {
      roles: [{ id: node.id, zone: "dev", capacity: 10 * 1024 ** 3, tags: [] }],
    });
    const layout = await call<{ version: number }>("GET", "GetClusterLayout");
    await call("POST", "ApplyClusterLayout", { version: layout.version + 1 });
    log(`garage: node ${node.id.slice(0, 16)} given its storage role`);
  }

  if (!(await find(`GetKeyInfo?id=${g.accessKeyId}`))) {
    await call("POST", "ImportKey", {
      accessKeyId: g.accessKeyId,
      secretAccessKey: g.secretAccessKey,
      name: "scripturetips",
    });
    log(`garage: key ${g.accessKeyId} imported`);
  }

  let bucket = await find<{ id: string }>(`GetBucketInfo?globalAlias=${g.bucket}`);
  if (!bucket) {
    bucket = await call<{ id: string }>("POST", "CreateBucket", { globalAlias: g.bucket });
    log(`garage: bucket ${g.bucket} created`);
  }
  await call("POST", "AllowBucketKey", {
    bucketId: bucket.id,
    accessKeyId: g.accessKeyId,
    permissions: { read: true, write: true, owner: true },
  });
}
