import { createChallenge, randomInt } from "altcha-lib";
import { deriveKey } from "altcha-lib/algorithms/pbkdf2";
import { verify } from "altcha-lib/frameworks/shared";
import type { KeyStore } from "./store.ts";

/**
 * The self-hosted bot check (ALTCHA, vision §11 item 6): the browser solves a small
 * proof-of-work puzzle before a sign-in code is sent. Nothing goes to a third party.
 */
export interface BotCheck {
  challenge(): Promise<unknown>;
  /** True if `payload` solves a challenge we issued, unexpired and not used before. */
  verify(payload: string | undefined): Promise<boolean>;
}

export interface BotCheckOptions {
  secret: string;
  store: KeyStore;
  /** PBKDF2 iterations per guess, and the most guesses needed: the work asked of a browser. */
  cost?: number;
  maxGuesses?: number;
}

const VALID_FOR = 10 * 60;

export function botCheck({
  secret,
  store,
  cost = 1000,
  maxGuesses = 10_000,
}: BotCheckOptions): BotCheck {
  const hmacSignatureSecret = `${secret}:altcha`;
  return {
    challenge: () =>
      createChallenge({
        algorithm: "PBKDF2/SHA-256",
        cost,
        counter: randomInt(Math.floor(maxGuesses / 2), maxGuesses),
        deriveKey,
        expiresAt: Math.floor(Date.now() / 1000) + VALID_FOR,
        hmacSignatureSecret,
      }),
    async verify(payload) {
      if (!payload) return false;
      const { error, verification } = await verify(
        payload,
        deriveKey,
        hmacSignatureSecret,
        undefined,
        {
          get: () => undefined,
          set: () => undefined,
          // Each solution works once.
          setIfAbsent: (key) => store.claim(`altcha:${key}`, VALID_FOR),
        },
      );
      return error === null && verification?.verified === true;
    },
  };
}
