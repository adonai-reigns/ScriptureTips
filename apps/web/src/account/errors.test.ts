import { describe, expect, it } from "vitest";
import { accountError } from "./errors.ts";

const res = (status: number, body: object) => new Response(JSON.stringify(body), { status });

describe("accountError", () => {
  it.each([
    [403, { code: "BOT_CHECK_FAILED" }, "bot-check-failed"],
    [429, { code: "TOO_MANY_CODES" }, "too-many-codes"],
    [429, { message: "Too many requests" }, "rate-limited"],
    [400, { code: "INVALID_OTP" }, "wrong-code"],
    [400, { code: "OTP_EXPIRED" }, "code-expired"],
    [403, { code: "TOO_MANY_ATTEMPTS" }, "too-many-attempts"],
    [409, { code: "handle-taken" }, "handle-taken"],
    [400, { code: "invalid-request", issues: [{ path: ["handle"] }] }, "handle-invalid"],
    [400, { code: "invalid-request", issues: [{ path: ["name"] }] }, "name-invalid"],
    [400, { code: "VALIDATION_ERROR" }, "invalid-email"],
    [500, {}, "unavailable"],
  ])("reads %i %j as %s", async (status, body, expected) => {
    expect(await accountError(res(status, body), "invalid-email")).toBe(expected);
  });
});
