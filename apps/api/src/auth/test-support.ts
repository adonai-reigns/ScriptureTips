import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { solveChallenge } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";
import { botCheck } from "./bot-check.ts";
import type { AccountSettings } from "./config.ts";
import { memoryStore } from "./store.ts";

/** Account settings for tests: a memory store, a list of sent mail, and an easy bot check. */
export function testAccounts() {
  const store = memoryStore();
  const sent: { to: string; subject: string; text: string }[] = [];
  const settings: AccountSettings = {
    store,
    mailer: {
      send: async (message) => {
        sent.push(message);
      },
    },
    botCheck: botCheck({ secret: "test-secret", store, cost: 1, maxGuesses: 20 }),
    secret: "test-secret-at-least-32-characters-long",
    baseUrl: "http://localhost:3000",
    trustedOrigins: [],
  };
  return { settings, sent };
}

/** Solves a bot-check challenge as the browser widget would, giving its payload. */
export async function solve(challenge: unknown): Promise<string> {
  const c = challenge as Parameters<typeof solveChallenge>[0]["challenge"];
  const solution = await solveChallenge({ challenge: c, deriveKey });
  return btoa(JSON.stringify({ challenge: c, solution }));
}

/** Signs in as `email` with a fresh emailed code, through the app's own endpoints; returns the session cookie. */
export async function signIn(
  app: { inject: NestFastifyApplication["inject"] },
  sent: readonly { to: string; text: string }[],
  email: string,
): Promise<string> {
  const check = await solve(
    (await app.inject({ method: "GET", url: "/api/account/bot-check" })).json(),
  );
  await app.inject({
    method: "POST",
    url: "/api/auth/email-otp/send-verification-otp",
    payload: { email, type: "sign-in" },
    headers: { "x-bot-check": check },
  });
  const otp = /\b(\d{6})\b/.exec(sent.filter((m) => m.to === email).at(-1)?.text ?? "")?.[1];
  const response = await app.inject({
    method: "POST",
    url: "/api/auth/sign-in/email-otp",
    payload: { email, otp },
  });
  const cookie = [response.headers["set-cookie"]].flat().find((c) => c?.includes("session_token"));
  if (!cookie) throw new Error(`no session cookie for ${email}`);
  return cookie.split(";")[0] ?? "";
}
