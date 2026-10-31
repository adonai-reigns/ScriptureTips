"use client";

import { CANON_IDS } from "@scripturetips/canon";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useHydrated } from "../hydrated.ts";
import type { Account } from "./api.ts";
import { CountryField } from "./CountryField.tsx";
import { type AccountError, accountError } from "./errors.ts";
import { FavoriteTranslations } from "./FavoriteTranslations.tsx";

/** The handle (chosen once, for now), display name and canon profile. */
export function AccountForm({
  account,
  translations,
}: {
  account: Account;
  /** The public translations (those that can be a base), favorites first, then the rest. */
  translations: { id: string; label: string }[];
}) {
  const t = useTranslations("account");
  const te = useTranslations("accountErrors");
  const tc = useTranslations("canons");
  const [error, setError] = useState<AccountError | null>(null);
  const [busy, setBusy] = useState(false);
  const hydrated = useHydrated();

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const body = {
      ...(account.handle === null ? { handle: String(form.get("handle") ?? "") } : {}),
      name: String(form.get("name") ?? ""),
      // Choosing "Choose…" again withdraws it.
      gender: String(form.get("gender") ?? "") || null,
      ageBracket: String(form.get("ageBracket") ?? "") || null,
      ...(form.get("canon") ? { canon: String(form.get("canon")) } : {}),
      favoriteTranslations: form.getAll("favorite").map(String),
      otherTranslations: form.getAll("other").map(String),
      favoritesOnly: form.has("favoritesOnly"),
      // The country (a code, or none), or what they wrote when theirs isn't on the list.
      ...(form.has("countryNotListed")
        ? { countryNotListed: String(form.get("countryNotListed") ?? "") }
        : { country: String(form.get("country") ?? "") || null }),
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
    <form className="account-form account-profile" onSubmit={save}>
      {/* The handle and display name are public by nature, so they're a group under "About you"
          with no privacy control of their own. Side by side on a wide screen, stacked on a phone. */}
      <fieldset className="account-pair">
        <legend>{t("yourName")}</legend>
        <div className="account-pair-fields">
          <div className="account-row">
            <div className="account-row-head">
              <div className="account-row-label">
                <label htmlFor="account-handle">{t("handle")}</label>
              </div>
            </div>
            {account.handle === null ? (
              <input
                id="account-handle"
                name="handle"
                required
                minLength={3}
                maxLength={30}
                pattern="[A-Za-z0-9\-]{3,30}"
                autoComplete="username"
              />
            ) : (
              <input id="account-handle" value={`@${account.handle}`} readOnly />
            )}
          </div>

          <div className="account-row">
            <div className="account-row-head">
              <div className="account-row-label">
                <label htmlFor="account-name">{t("name")}</label>
              </div>
            </div>
            <input
              id="account-name"
              name="name"
              defaultValue={account.name}
              required
              maxLength={60}
              autoComplete="nickname"
            />
          </div>
        </div>
        <hr className="account-divider" />
        {/* Optional details. The privacy menus beside them are not saved yet (vision §10, "Privacy selectors"). */}
        <div className="account-pair-extra">
          <div className="account-row">
            <div className="account-row-head">
              <div className="account-row-label">
                <label htmlFor="account-gender">{t("gender")}</label>
              </div>
              <PrivacyMenu field="gender" label={t("gender")} value="private" />
            </div>
            <select id="account-gender" name="gender" defaultValue={account.gender ?? ""}>
              {/* No "prefer not to say": it starts unchosen, and going back to unchosen withdraws it. */}
              <option value="">{t("choose")}</option>
              {GENDERS.map((v) => (
                <option key={v} value={v}>
                  {t(`genderOptions.${v}`)}
                </option>
              ))}
            </select>
            <small className="account-row-help">{t("genderHelp")}</small>
          </div>
          <div className="account-row">
            <div className="account-row-head">
              <div className="account-row-label">
                <label htmlFor="account-age">{t("ageBracket")}</label>
              </div>
              <PrivacyMenu field="age" label={t("ageBracket")} value="private" />
            </div>
            <select id="account-age" name="ageBracket" defaultValue={account.ageBracket ?? ""}>
              <option value="">{t("choose")}</option>
              {AGE_BRACKETS.map((v) => (
                <option key={v} value={v}>
                  {t(`ageOptions.${v}`)}
                </option>
              ))}
            </select>
            <small className="account-row-help">{t("ageHelp")}</small>
          </div>
          <div className="account-row">
            <div className="account-row-head">
              <div className="account-row-label">
                <label htmlFor="account-country">{t("country")}</label>
              </div>
              <PrivacyMenu field="country" label={t("country")} value="private" />
            </div>
            <CountryField country={account.country} claim={account.countryClaim} />
          </div>
        </div>
      </fieldset>

      <fieldset className="account-pair" id="settings" aria-describedby="canon-help">
        <legend>{t("canon")}</legend>
        <div className="account-row">
          <div className="account-row-head">
            <small id="canon-help" className="account-row-help">
              {t("canonHelp")}
            </small>
            <PrivacyMenu field="canon" label={t("canon")} value="private" />
          </div>
          <div className="choices">
            {CANON_IDS.map((id) => (
              <label key={id} className="choice">
                <input
                  type="radio"
                  name="canon"
                  value={id}
                  required
                  defaultChecked={account.canon === id}
                />
                <span>
                  <strong>{tc(id)}</strong> <small>{tc(`${id}Help`)}</small>
                </span>
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <FavoriteTranslations
        options={translations}
        favorites={account.favoriteTranslations}
        favoritesOnly={account.favoritesOnly}
      />

      {error && (
        <p role="alert" className="error">
          {te(error)}
        </p>
      )}
      <button type="submit" disabled={busy || !hydrated}>
        {t("save")}
      </button>
    </form>
  );
}

/** The choices for the optional details (labels are in the messages). */
const GENDERS = ["female", "male", "both"] as const;
const AGE_BRACKETS = ["child", "teen", "adult", "senior"] as const;

type Visibility = "private" | "members" | "public";
const VISIBILITIES: readonly Visibility[] = ["private", "members", "public"];

/**
 * Who can see a field: only the chosen option shows (at the end of the label's line), and pressing
 * it opens a menu of the three (private, members only, public).
 */
function PrivacyMenu({ field, label, value }: { field: string; label: string; value: Visibility }) {
  const t = useTranslations("account");
  const [chosen, setChosen] = useState<Visibility>(value);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  return (
    <span ref={root} className="privacy-menu">
      <input type="hidden" name={`privacy-${field}`} value={chosen} />
      <button
        ref={button}
        type="button"
        className="privacy-menu-toggle"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t("privacy.for", { field: label })}: ${t(`privacy.${chosen}`)}`}
        onClick={() => setOpen(!open)}
      >
        {t(`privacy.${chosen}`)}
        <span aria-hidden="true"> ▾</span>
      </button>
      {open ? (
        <span
          className="privacy-menu-panel"
          role="menu"
          aria-label={t("privacy.for", { field: label })}
        >
          {VISIBILITIES.map((v) => (
            <button
              key={v}
              type="button"
              role="menuitemradio"
              aria-checked={v === chosen}
              onClick={() => {
                setChosen(v);
                setOpen(false);
                button.current?.focus();
              }}
            >
              {t(`privacy.${v}`)}
            </button>
          ))}
        </span>
      ) : null}
    </span>
  );
}

/** Signs out, then goes to the home page. */
export async function signOut(): Promise<void> {
  await fetch("/api/auth/sign-out", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  }).catch(() => undefined);
  window.location.assign("/");
}
