import { type BotCheck, botCheck } from "./bot-check.ts";
import { type Mailer, smtpMailer } from "./mailer.ts";
import { type KeyStore, valkeyStore } from "./store.ts";

/** What accounts need besides the database. Tests pass their own (a memory store, a mail list). */
export interface AccountSettings {
  store: KeyStore;
  mailer: Mailer;
  botCheck: BotCheck;
  secret: string;
  baseUrl: string;
  trustedOrigins: readonly string[];
}

const required = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} isn't set (compose.yaml sets it for development)`);
  return value;
};

/**
 * From the environment: `AUTH_SECRET`, `AUTH_URL` (the web app's origin), `TRUSTED_ORIGINS`
 * (comma-separated), `VALKEY_URL`, `SMTP_URL`, `MAIL_FROM`, and `BOT_CHECK_COST` (PBKDF2
 * iterations per guess; optional).
 */
export function accountSettingsFromEnv(): AccountSettings {
  const secret = required("AUTH_SECRET");
  const store = valkeyStore(required("VALKEY_URL"));
  const cost = process.env["BOT_CHECK_COST"];
  return {
    store,
    mailer: smtpMailer(required("SMTP_URL"), required("MAIL_FROM")),
    botCheck: botCheck({ secret, store, ...(cost ? { cost: Number(cost) } : {}) }),
    secret,
    baseUrl: required("AUTH_URL"),
    trustedOrigins: (process.env["TRUSTED_ORIGINS"] ?? "").split(",").filter(Boolean),
  };
}
