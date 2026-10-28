/** An error response from the API or Better Auth, as one of our `accountErrors` message keys. */
export type AccountError =
  | "bot-check-pending"
  | "bot-check-failed"
  | "too-many-codes"
  | "rate-limited"
  | "invalid-email"
  | "wrong-code"
  | "code-expired"
  | "too-many-attempts"
  | "handle-taken"
  | "handle-reserved"
  | "handle-invalid"
  | "handle-already-chosen"
  | "name-invalid"
  | "name-reserved"
  | "unavailable";

const BY_CODE: Record<string, AccountError> = {
  BOT_CHECK_FAILED: "bot-check-failed",
  TOO_MANY_CODES: "too-many-codes",
  INVALID_OTP: "wrong-code",
  OTP_EXPIRED: "code-expired",
  TOO_MANY_ATTEMPTS: "too-many-attempts",
  "handle-taken": "handle-taken",
  "handle-reserved": "handle-reserved",
  "handle-already-chosen": "handle-already-chosen",
  "name-reserved": "name-reserved",
};

/** Reads an error response. `fallback` covers a 400 with no code we know. */
export async function accountError(res: Response, fallback: AccountError): Promise<AccountError> {
  const body = (await res.json().catch(() => ({}))) as {
    code?: string;
    issues?: { path?: (string | number)[] }[];
  };
  const known = body.code ? BY_CODE[body.code] : undefined;
  if (known) return known;
  if (res.status === 429) return "rate-limited";
  if (body.code === "invalid-request")
    return body.issues?.some((i) => i.path?.[0] === "name") ? "name-invalid" : "handle-invalid";
  return res.status === 400 ? fallback : "unavailable";
}
