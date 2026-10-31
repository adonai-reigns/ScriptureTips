"use client";

import {
  type CountryOption,
  countryFromText,
  countryName,
  countryOptions,
} from "@scripturetips/countries";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";

/**
 * The location field: a country, typed or picked from the list (the browser's own list under the
 * field), checked against it. What the form sends is the country's code (`country`). Where the
 * country isn't on the list, "My country isn't listed" turns the field into a plain one for the
 * country's name (`countryNotListed`): that's kept for review and shown to no one until then.
 *
 * The names are the browser's (CLDR through `Intl`), so they're filled in once the page is running,
 * not in the server's HTML, where they could differ.
 */
export function CountryField({
  country,
  claim,
}: {
  /** The country now (a code), or null. */
  country: string | null;
  /** What they wrote when it wasn't listed, awaiting review, or null. */
  claim: string | null;
}) {
  const t = useTranslations("account");
  const locale = useLocale();
  const listId = useId();
  const field = useRef<HTMLInputElement>(null);
  const [options, setOptions] = useState<CountryOption[]>([]);
  const [text, setText] = useState("");
  const [notListed, setNotListed] = useState(false);

  useEffect(() => {
    setOptions(countryOptions(locale));
    if (country) setText(countryName(country as CountryOption["code"], locale));
  }, [locale, country]);

  const code = countryFromText(text, locale);
  // Something typed that isn't on the list stops the form being sent, with a message.
  useEffect(() => {
    field.current?.setCustomValidity(text.trim() !== "" && !code ? t("countryChoose") : "");
  }, [text, code, t]);

  if (notListed)
    return (
      <div className="country-field">
        <input
          key="claim"
          id="account-country"
          name="countryNotListed"
          // What they had typed in the list field carries over.
          defaultValue={text.trim() || (claim ?? "")}
          required
          minLength={2}
          maxLength={100}
          aria-describedby="country-claim-help"
          placeholder={t("countryClaimLabel")}
        />
        <small id="country-claim-help" className="account-row-help">
          {t("countryClaimHelp")}
        </small>
        <button type="button" className="link-button" onClick={() => setNotListed(false)}>
          {t("countryFromList")}
        </button>
      </div>
    );
  return (
    <div className="country-field">
      <input
        key="list"
        ref={field}
        id="account-country"
        value={text}
        onChange={(e) => setText(e.target.value)}
        list={listId}
        maxLength={80}
        autoComplete="off"
        placeholder={t("countryPlaceholder")}
      />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o.code} value={o.name} />
        ))}
      </datalist>
      <input type="hidden" name="country" value={code ?? ""} />
      {claim && !country ? (
        <small className="account-row-help">{t("countryClaimNoted", { claim })}</small>
      ) : null}
      <button type="button" className="link-button" onClick={() => setNotListed(true)}>
        {t("countryNotListed")}
      </button>
    </div>
  );
}
