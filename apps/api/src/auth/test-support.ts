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
