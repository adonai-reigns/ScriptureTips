import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { testDatabase } from "@scripturetips/db/test-support";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { CODE, CODES_PER_ADDRESS_PER_HOUR } from "./auth.ts";
import { memoryStore } from "./store.ts";
import { solve, testAccounts } from "./test-support.ts";

let app: NestFastifyApplication;
let drop: () => Promise<void>;
let sent: ReturnType<typeof testAccounts>["sent"];

beforeAll(async () => {
  let url: string;
  ({ url, drop } = await testDatabase());
  const accounts = testAccounts();
  sent = accounts.sent;
  app = await createApp({ databaseUrl: url, accounts: accounts.settings });
  await app.init();
});

afterAll(async () => {
  await app.close();
  await drop();
});

const post = (url: string, payload: object, headers: Record<string, string> = {}) =>
  app.inject({ method: "POST", url, payload, headers });

const solved = async () =>
  solve((await app.inject({ method: "GET", url: "/api/account/bot-check" })).json());

const askForCode = async (email: string, check?: string) =>
  post(
    "/api/auth/email-otp/send-verification-otp",
    { email, type: "sign-in" },
    { "x-bot-check": check ?? (await solved()) },
  );

const codeSentTo = (email: string) => {
  const mail = sent.filter((m) => m.to === email).at(-1);
  return /\b(\d{6})\b/.exec(mail?.text ?? "")?.[1];
};

/** Signs in with a fresh code; returns the session cookie. */
const signIn = async (email: string) => {
  expect((await askForCode(email)).statusCode).toBe(200);
  const response = await post("/api/auth/sign-in/email-otp", { email, otp: codeSentTo(email) });
  expect(response.statusCode).toBe(200);
  const cookie = [response.headers["set-cookie"]].flat().find((c) => c?.includes("session_token"));
  if (!cookie) throw new Error("no session cookie");
  return cookie.split(";")[0] ?? "";
};

const account = (cookie: string) =>
  app.inject({ method: "GET", url: "/api/account", headers: { cookie } });
const update = (cookie: string, payload: object) =>
  app.inject({ method: "PUT", url: "/api/account", headers: { cookie }, payload });

describe("vision §11: sign-in with a one-time email code", () => {
  it("emails a 6-digit code, and signing in with it creates the account", async () => {
    expect((await askForCode("New.Reader@example.com")).statusCode).toBe(200);
    const mail = sent.at(-1);
    expect(mail?.to).toBe("new.reader@example.com");
    expect(mail?.subject).toBe("Your ScriptureTips sign-in code");
    expect(mail?.text).toContain(`within the next ${CODE.minutes} minutes`);
    const cookie = await signIn("new.reader@example.com");
    expect((await account(cookie)).json()).toEqual({
      email: "new.reader@example.com",
      handle: null,
      name: "",
      locale: "en-NZ",
      trustLevel: 0,
    });
  });

  it("refuses a wrong code, and a code stops working after 3 wrong attempts", async () => {
    await askForCode("guess@example.com");
    const code = codeSentTo("guess@example.com");
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < CODE.attempts; i++) {
      expect(
        (await post("/api/auth/sign-in/email-otp", { email: "guess@example.com", otp: wrong }))
          .statusCode,
      ).toBe(400);
    }
    const late = await post("/api/auth/sign-in/email-otp", {
      email: "guess@example.com",
      otp: code,
    });
    expect(late.statusCode).not.toBe(200);
  });

  it("asks for a solved bot check before sending a code, and each solution works once", async () => {
    const none = await post("/api/auth/email-otp/send-verification-otp", {
      email: "bot@example.com",
      type: "sign-in",
    });
    expect(none.statusCode).toBe(403);
    expect(none.json()).toMatchObject({ code: "BOT_CHECK_FAILED" });
    const check = await solved();
    expect((await askForCode("bot@example.com", check)).statusCode).toBe(200);
    expect((await askForCode("bot@example.com", check)).statusCode).toBe(403);
    expect(sent.filter((m) => m.to === "bot@example.com")).toHaveLength(1);
  });

  it(`sends at most ${CODES_PER_ADDRESS_PER_HOUR} codes an hour to one address`, async () => {
    for (let i = 0; i < CODES_PER_ADDRESS_PER_HOUR; i++) {
      expect((await askForCode("flood@example.com")).statusCode).toBe(200);
    }
    const over = await askForCode("flood@example.com");
    expect(over.statusCode).toBe(429);
    expect(over.json()).toMatchObject({ code: "TOO_MANY_CODES" });
  });

  it("answers 401 when signed out, and signing out ends the session", async () => {
    expect((await app.inject({ method: "GET", url: "/api/account" })).statusCode).toBe(401);
    const cookie = await signIn("leaving@example.com");
    const out = await post("/api/auth/sign-out", {}, { cookie, origin: "http://localhost:3000" });
    expect(out.statusCode).toBe(200);
    expect((await account(cookie)).statusCode).toBe(401);
  });
});

describe("domain-model §1.6: handles", () => {
  it("are chosen once, stored lowercase, and unique", async () => {
    const first = await signIn("first@example.com");
    const chosen = await update(first, { handle: "Plain-Words", name: "Ānaru" });
    expect(chosen.statusCode).toBe(200);
    expect(chosen.json()).toMatchObject({ handle: "plain-words", name: "Ānaru" });
    expect((await update(first, { handle: "other" })).json()).toMatchObject({
      code: "handle-already-chosen",
    });

    const second = await signIn("second@example.com");
    const taken = await update(second, { handle: "plain-words" });
    expect(taken.statusCode).toBe(409);
    expect(taken.json()).toMatchObject({ code: "handle-taken" });
  });

  it.each([
    ["ab"],
    ["-start"],
    ["end-"],
    ["double--hyphen"],
    ["Ελληνικά"],
    ["dot.ted"],
    ["a".repeat(31)],
  ])("refuse %s", async (handle) => {
    const cookie = await signIn(`refuse-${handle.length}-${handle.charCodeAt(0)}@example.com`);
    expect((await update(cookie, { handle })).json()).toMatchObject({ code: "invalid-request" });
  });

  it("refuse reserved words", async () => {
    const cookie = await signIn("reserved@example.com");
    expect((await update(cookie, { handle: "Admin" })).json()).toMatchObject({
      code: "handle-reserved",
    });
  });
});

describe("memoryStore", () => {
  it("counts within a window, then starts again", async () => {
    let now = 0;
    const store = memoryStore(() => now);
    expect((await store.increment("k", 60)).count).toBe(1);
    expect(await store.increment("k", 60)).toEqual({ count: 2, expiresIn: 60 });
    now = 61_000;
    expect((await store.increment("k", 60)).count).toBe(1);
    expect(await store.claim("c", 10)).toBe(true);
    expect(await store.claim("c", 10)).toBe(false);
  });
});
