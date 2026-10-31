"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";

/** The value of the last option in a menu that leaves some translations out. */
const SHOW_ALL = "::show-all";

/**
 * For a menu of translations where the person's "only favorites" leaves some out (`more`): the
 * ones to list now, and the way to ask for all. For a `<select>`, add `moreOption` as its last
 * option and return from `onChange` when `intercept(value)` is true. For another kind of menu,
 * use `hidden` and `showAll()`. Anything in `keep` is listed whatever happens (what is chosen now).
 */
export function useMoreTranslations<T extends { id: string; more?: true }>(
  options: readonly T[],
  keep: readonly string[] = [],
) {
  const t = useTranslations("search");
  const [all, setAll] = useState(false);
  const shown = options.filter((o) => !o.more || all || keep.includes(o.id));
  const hidden = shown.length < options.length;
  const moreOption: ReactNode = hidden ? <option value={SHOW_ALL}>{t("showAll")}</option> : null;
  return {
    shown,
    hidden,
    moreOption,
    showAll: () => setAll(true),
    /** True (and the menu grows) when the "show all" option was chosen. */
    intercept: (value: string) => {
      if (value !== SHOW_ALL) return false;
      setAll(true);
      return true;
    },
  };
}
