"use client";

import type {} from "altcha/types/react";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";
import { type AccountError, accountError } from "./errors.ts";

const json = { "content-type": "application/json" };

/**
 * Sign-in with a one-time email code (vision §11, Decided): an email address and a bot check,
 * then the code from the email. A new address becomes an account on its first sign-in.
 */
export function SignInForm() {
  const t = useTranslations("account");
  const te = useTranslations("accountErrors");
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState<AccountError | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // The bot-check widget is a web component that runs only in the browser.
    void import("altcha");
  }, []);

  const sendCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const check = form.get("altcha");
    if (typeof check !== "string" || check === "") return setError("bot-check-pending");
    const address = String(form.get("email") ?? "").trim();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/email-otp/send-verification-otp", {
        method: "POST",
        headers: { ...json, "x-bot-check": check },
        body: JSON.stringify({ email: address, type: "sign-in" }),
      });
      if (!res.ok) return setError(await accountError(res, "invalid-email"));
      setEmail(address);
      setStep("code");
    } catch {
      setError("unavailable");
    } finally {
      setBusy(false);
    }
  };

  const signIn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const otp = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s/g, "");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/sign-in/email-otp", {
        method: "POST",
        headers: json,
        body: JSON.stringify({ email, otp }),
      });
      if (!res.ok) return setError(await accountError(res, "wrong-code"));
      window.location.assign("/account");
    } catch {
      setError("unavailable");
    } finally {
      setBusy(false);
    }
  };

  const message = error && (
    <p role="alert" className="error">
      {te(error)}
    </p>
  );

  if (step === "code") {
    return (
      <form className="account-form" onSubmit={signIn}>
        <p>{t("codeSent", { email })}</p>
        <label>
          <span>{t("code")}</span>
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,7}"
            maxLength={7}
            required
            // biome-ignore lint/a11y/noAutofocus: the code is the only thing to do on this step
            autoFocus
          />
        </label>
        {message}
        <button type="submit" disabled={busy}>
          {t("signInButton")}
        </button>
        <button
          type="button"
          className="link-button"
          onClick={() => {
            setStep("email");
            setError(null);
          }}
        >
          {t("newCode")}
        </button>
      </form>
    );
  }

  return (
    <form className="account-form" onSubmit={sendCode}>
      <label>
        <span>{t("email")}</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={email}
          required
          maxLength={254}
        />
      </label>
      <altcha-widget challenge="/api/account/bot-check" auto="onfocus" name="altcha" />
      {message}
      <button type="submit" disabled={busy}>
        {t("sendCode")}
      </button>
    </form>
  );
}
