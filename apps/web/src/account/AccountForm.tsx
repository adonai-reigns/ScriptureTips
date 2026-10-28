"use client";

import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import type { Account } from "./api.ts";
import { type AccountError, accountError } from "./errors.ts";

/** The handle (chosen once, for now) and display name. */
export function AccountForm({ account }: { account: Account }) {
  const t = useTranslations("account");
  const te = useTranslations("accountErrors");
  const [error, setError] = useState<AccountError | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      ...(account.handle === null ? { handle: String(form.get("handle") ?? "") } : {}),
      name: String(form.get("name") ?? ""),
    };
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return setError(await accountError(res, "handle-invalid"));
      // The header shows the handle: reload so it's current.
      window.location.reload();
    } catch {
      setError("unavailable");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="account-form" onSubmit={save}>
      {account.handle === null ? (
        <label>
          <span>{t("handle")}</span>
          <input
            name="handle"
            required
            minLength={3}
            maxLength={30}
            pattern="[A-Za-z0-9\-]{3,30}"
            autoComplete="username"
          />
          <small>{t("handleHelp", { example: "your-handle" })}</small>
        </label>
      ) : (
        <div className="field">
          <span>{t("handle")}</span>
          <output>@{account.handle}</output>
        </div>
      )}
      <label>
        <span>{t("name")}</span>
        <input
          name="name"
          defaultValue={account.name}
          required
          maxLength={60}
          autoComplete="nickname"
        />
        <small>{t("nameHelp")}</small>
      </label>
      {error && (
        <p role="alert" className="error">
          {te(error)}
        </p>
      )}
      <button type="submit" disabled={busy}>
        {t("save")}
      </button>
    </form>
  );
}

/** Ends the session and goes home. */
export function SignOutButton() {
  const t = useTranslations("account");
  return (
    <button
      type="button"
      className="link-button"
      onClick={async () => {
        await fetch("/api/auth/sign-out", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        }).catch(() => undefined);
        window.location.assign("/");
      }}
    >
      {t("signOut")}
    </button>
  );
}
