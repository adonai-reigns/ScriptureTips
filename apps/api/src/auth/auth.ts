import type { Database } from "@scripturetips/db";
import { authAccount, session, user, verification } from "@scripturetips/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { emailOTP } from "better-auth/plugins/email-otp";
import type { BotCheck } from "./bot-check.ts";
import type { Mailer } from "./mailer.ts";
import { signInEmail } from "./messages.ts";
import type { KeyStore } from "./store.ts";

/** Sign-in codes: 6 digits, valid for 10 minutes, 3 attempts each (vision §11, Decided). */
export const CODE = { length: 6, minutes: 10, attempts: 3 } as const;

/** Most codes sent to one address in an hour, whoever asks: stops an inbox being flooded. */
export const CODES_PER_ADDRESS_PER_HOUR = 5;

/** Most code requests from one IP address in an hour. Generous: a church's wifi is one address. */
export const CODE_REQUESTS_PER_IP_PER_HOUR = 60;

export interface AuthOptions {
  db: Database;
  mailer: Mailer;
  store: KeyStore;
  botCheck: BotCheck;
  /** Signs session cookies: `AUTH_SECRET`. */
  secret: string;
  /** The web app's origin, where users sign in (`AUTH_URL`). */
  baseUrl: string;
  /** Other origins the web app is served on (`TRUSTED_ORIGINS`). */
  trustedOrigins: readonly string[];
}

/**
 * Accounts on Better Auth: sign-in with a one-time email code and no passwords. A new address
 * becomes an account on its first sign-in. Asking for a code takes a solved bot check
 * (`x-bot-check` header) and is rate limited per address and per IP.
 */
export function createAuth(o: AuthOptions) {
  return betterAuth({
    appName: "ScriptureTips",
    baseURL: o.baseUrl,
    basePath: "/api/auth",
    secret: o.secret,
    trustedOrigins: [...o.trustedOrigins],
    database: drizzleAdapter(o.db, {
      provider: "pg",
      schema: { user, session, account: authAccount, verification },
    }),
    advanced: {
      // PostgreSQL makes UUIDv7 keys (domain-model §1.1).
      database: { generateId: false },
      // Requests reach the API through the web app's proxy.
      ipAddress: { ipAddressHeaders: ["x-forwarded-for"] },
    },
    user: {
      additionalFields: {
        handle: { type: "string", required: false, input: false },
        locale: { type: "string", required: false, input: false },
        trustLevel: { type: "number", required: false, input: false },
      },
    },
    // A month, renewed daily while in use, so sign-in emails stay few.
    session: { expiresIn: 30 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customStorage: {
        consume: async (key, { window, max }) => {
          const { count, expiresIn } = await o.store.increment(`rate:${key}`, window);
          return count <= max
            ? { allowed: true, retryAfter: null }
            : { allowed: false, retryAfter: expiresIn };
        },
      },
      customRules: {
        "/email-otp/send-verification-otp": { window: 60 * 60, max: CODE_REQUESTS_PER_IP_PER_HOUR },
        "/sign-in/email-otp": { window: 10 * 60, max: 20 },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/email-otp/send-verification-otp") return;
        if (!(await o.botCheck.verify(ctx.headers?.get("x-bot-check") ?? undefined)))
          throw new APIError("FORBIDDEN", {
            code: "BOT_CHECK_FAILED",
            message: "Bot check failed",
          });
        const email = String(
          (ctx.body as { email?: unknown } | undefined)?.email ?? "",
        ).toLowerCase();
        const { count } = await o.store.increment(`codes:${email}`, 60 * 60);
        if (count > CODES_PER_ADDRESS_PER_HOUR)
          throw new APIError("TOO_MANY_REQUESTS", {
            code: "TOO_MANY_CODES",
            message: "Too many codes",
          });
      }),
    },
    plugins: [
      emailOTP({
        otpLength: CODE.length,
        expiresIn: CODE.minutes * 60,
        allowedAttempts: CODE.attempts,
        storeOTP: "hashed",
        rateLimit: { window: 60 * 60, max: CODE_REQUESTS_PER_IP_PER_HOUR },
        sendVerificationOTP: async ({ email, otp, type }) => {
          if (type !== "sign-in") return;
          // Not awaited, so the response time doesn't reveal anything about the address.
          o.mailer
            .send({ to: email, ...signInEmail(otp, CODE.minutes) })
            .catch((e: unknown) => console.error("Sign-in email failed:", e));
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
