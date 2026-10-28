/** Injection tokens: the Better Auth instance and the account settings. */
export const AUTH = Symbol("auth");
export const SETTINGS = Symbol("account settings");

export interface FastifyRequestLike {
  url: string;
  method: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
}
export interface FastifyReplyLike {
  status(code: number): FastifyReplyLike;
  header(name: string, value: string | string[]): FastifyReplyLike;
  send(body?: string | null): FastifyReplyLike;
}

/** Fastify's request headers as Fetch headers, for Better Auth. */
export function fetchHeaders(headers: FastifyRequestLike["headers"]): Headers {
  const out = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value])
      out.append(name, v);
  }
  return out;
}
