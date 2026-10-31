import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { translation } from "@scripturetips/db";
import { testDatabase } from "@scripturetips/db/test-support";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { testBuilds } from "../pdf-builds/test-support.ts";
import { CODE, CODES_PER_ADDRESS_PER_HOUR } from "./auth.ts";
import { memoryStore } from "./store.ts";
import { solve, testAccounts } from "./test-support.ts";

let app: NestFastifyApplication;
let drop: () => Promise<void>;
let sent: ReturnType<typeof testAccounts>["sent"];

beforeAll(async () => {
  let url: string;
  let db: Awaited<ReturnType<typeof testDatabase>>["db"];
  ({ db, url, drop } = await testDatabase());
  const text = { language: "en", direction: "ltr", scheme: "kjv" } as const;
  await db.insert(translation).values([
    {
      catalogId: "kjv",
      abbreviation: "KJV",
      name: "King James",
      licenseKey: "public-domain",
      ...text,
    },
    { catalogId: "leb", abbreviation: "LEB", name: "Lexham", licenseKey: "leb", ...text },
    // A license the module doesn't know can't be a base.
    { catalogId: "odd", abbreviation: "ODD", name: "Odd", licenseKey: "unknown", ...text },
  ]);
  const accounts = testAccounts();
  sent = accounts.sent;
  app = await createApp({
    databaseUrl: url,
    accounts: accounts.settings,
    builds: testBuilds().settings,
  });
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
      canon: null,
      trustLevel: 0,
      country: null,
      gender: null,
      ageBracket: null,
      countryClaim: null,
      favoriteTranslations: ["leb", "engnet", "enggnv", "eng-kjv", "engylt"],
      otherTranslations: [],
      favoritesOnly: false,
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
    expect((await update(cookie, { name: "The Lord" })).json()).toMatchObject({
      code: "name-reserved",
    });
  });
});

describe("vision §3.4: canon profile", () => {
  it("has no default, is chosen from the profiles, and can be changed", async () => {
    const cookie = await signIn("canon@example.com");
    expect((await account(cookie)).json()).toMatchObject({ canon: null });
    expect((await update(cookie, { canon: "catholic" })).json()).toMatchObject({
      canon: "catholic",
    });
    expect((await update(cookie, { canon: "orthodox" })).json()).toMatchObject({
      canon: "orthodox",
    });
    const unknown = await update(cookie, { canon: "mine" });
    expect(unknown.statusCode).toBe(400);
    expect((await account(cookie)).json()).toMatchObject({ canon: "orthodox" });
  });
});

describe("the country", () => {
  // Sign-in is limited to 20 a window from one address, so these share accounts.
  it("is chosen from the list of country codes, and can be cleared", async () => {
    const cookie = await signIn("country@example.com");
    expect((await update(cookie, { country: "NZ" })).json()).toMatchObject({ country: "NZ" });
    expect((await update(cookie, { country: "XK" })).json()).toMatchObject({ country: "XK" });
    // Not a code on the list: not a name, not lowercase, not a grouping, not the unknown region.
    for (const country of ["New Zealand", "nz", "EU", "ZZ", "NZL", ""]) {
      const refused = await update(cookie, { country });
      expect(refused.statusCode, country).toBe(400);
      expect(refused.json()).toMatchObject({ code: "country-invalid" });
    }
    expect((await account(cookie)).json()).toMatchObject({ country: "XK" });
    expect((await update(cookie, { country: null })).json()).toMatchObject({ country: null });

    // The gender (saved with the other details): three choices, kept when others are saved.
    expect((await update(cookie, { gender: "female" })).json()).toMatchObject({ gender: "female" });
    expect((await update(cookie, { name: "Someone" })).json()).toMatchObject({ gender: "female" });
    expect((await update(cookie, { gender: "both" })).json()).toMatchObject({ gender: "both" });
    for (const gender of ["other", "Male", ""]) {
      expect((await update(cookie, { gender })).statusCode, String(gender)).toBe(400);
    }
    expect((await account(cookie)).json()).toMatchObject({ gender: "both" });
    // It can be withdrawn.
    expect((await update(cookie, { gender: null })).json()).toMatchObject({ gender: null });
    expect((await account(cookie)).json()).toMatchObject({ gender: null });

    // The age bracket: one of the offered brackets, kept, and can be withdrawn.
    expect((await update(cookie, { ageBracket: "teen" })).json()).toMatchObject({
      ageBracket: "teen",
    });
    expect((await update(cookie, { name: "Someone" })).json()).toMatchObject({
      ageBracket: "teen",
    });
    for (const ageBracket of ["25to34", "minor", "Adult", ""]) {
      expect((await update(cookie, { ageBracket })).statusCode, ageBracket).toBe(400);
    }
    expect((await update(cookie, { ageBracket: null })).json()).toMatchObject({ ageBracket: null });

    // Favorite translations: in order, with the rest and the favorites-only choice.
    expect((await account(cookie)).json()).toMatchObject({
      favoriteTranslations: ["leb", "engnet", "enggnv", "eng-kjv", "engylt"],
      otherTranslations: [],
      favoritesOnly: false,
    });
    const set = await update(cookie, {
      favoriteTranslations: ["leb"],
      otherTranslations: ["kjv"],
      favoritesOnly: true,
    });
    expect(set.json()).toMatchObject({
      favoriteTranslations: ["leb"],
      otherTranslations: ["kjv"],
      favoritesOnly: true,
    });
    // Kept when something else is saved.
    expect((await update(cookie, { name: "Someone" })).json()).toMatchObject({
      favoriteTranslations: ["leb"],
      favoritesOnly: true,
    });
    // Unknown, repeated, not-a-base translations, or one in both groups, are refused.
    for (const payload of [
      { favoriteTranslations: ["nope"] },
      { favoriteTranslations: ["kjv", "kjv"] },
      { otherTranslations: ["odd"] },
      { favoriteTranslations: ["leb"], otherTranslations: ["leb"] },
    ]) {
      const refused = await update(cookie, payload);
      expect(refused.statusCode, JSON.stringify(payload)).toBe(400);
      expect(refused.json()).toMatchObject({ code: "translations-invalid" });
    }
    expect(
      (await update(cookie, { favoriteTranslations: [], favoritesOnly: false })).json(),
    ).toMatchObject({ favoriteTranslations: [], favoritesOnly: false });
  });

  it("keeps a claim that the country isn't listed, for review, of a sensible length, and private to its owner", async () => {
    const cookie = await signIn("claim@example.com");
    await update(cookie, { country: "NZ" });
    const claimed = await update(cookie, { countryNotListed: "  Atlantis " });
    expect(claimed.json()).toMatchObject({ country: null, countryClaim: "Atlantis" });
    // A new claim replaces the old one; choosing a listed country drops it.
    expect((await update(cookie, { countryNotListed: "Lemuria" })).json()).toMatchObject({
      countryClaim: "Lemuria",
    });
    expect((await account(cookie)).json()).toMatchObject({ countryClaim: "Lemuria" });
    // A country or a claim, not both, and a claim of a sensible length.
    const both = await update(cookie, { country: "NZ", countryNotListed: "Atlantis" });
    expect(both.statusCode).toBe(400);
    expect((await update(cookie, { countryNotListed: "x" })).statusCode).toBe(400);
    expect((await update(cookie, { countryNotListed: "x".repeat(101) })).statusCode).toBe(400);
    // Another account's view never has it.
    const other = await signIn("other@example.com");
    expect((await account(other)).json()).toMatchObject({ country: null, countryClaim: null });
    expect((await update(cookie, { country: "AU" })).json()).toMatchObject({
      country: "AU",
      countryClaim: null,
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
