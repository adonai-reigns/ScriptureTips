/** What a person has chosen about translations in menus (the account's fields). */
export interface MenuPreferences {
  readonly favoriteTranslations: readonly string[];
  readonly otherTranslations: readonly string[];
  readonly favoritesOnly: boolean;
}

/** A translation as a menu offers it. `more` marks one the person's favorites leave out. */
export interface TranslationOption {
  readonly id: string;
  readonly label: string;
  readonly more?: true;
}

/**
 * Lays translations out for a menu: the favorites first in the person's order, then the rest in
 * theirs (any they haven't placed, such as a newly added translation, follow in the given order).
 * With "only favorites" on, the rest are marked `more`: menus list them only after the person
 * asks to see all. Anything in `keep` (what is selected now) is never marked, so a menu can always
 * show its current value. With no favorites, nothing is marked. Signed out (no preferences), the
 * order is unchanged.
 */
export function translationOptions<T extends { id: string; abbreviation: string; name: string }>(
  all: readonly T[],
  preferences: MenuPreferences | null | undefined,
  keep: readonly string[] = [],
): TranslationOption[] {
  const option = (t: T, more?: true): TranslationOption => ({
    id: t.id,
    label: `${t.abbreviation}: ${t.name}`,
    ...(more ? { more } : {}),
  });
  if (!preferences) return all.map((t) => option(t));
  const byId = new Map(all.map((t) => [t.id, t]));
  const favorites = preferences.favoriteTranslations.flatMap((id) => byId.get(id) ?? []);
  const taken = new Set(favorites.map((t) => t.id));
  const placed = preferences.otherTranslations.flatMap((id) => {
    const t = byId.get(id);
    if (!t || taken.has(id)) return [];
    taken.add(id);
    return [t];
  });
  const others = [...placed, ...all.filter((t) => !taken.has(t.id))];
  const hide = preferences.favoritesOnly && favorites.length > 0;
  return [
    ...favorites.map((t) => option(t)),
    ...others.map((t) => option(t, hide && !keep.includes(t.id) ? true : undefined)),
  ];
}

/** The translation to start from: the first favorite that is loaded, else `fallback`. */
export function defaultTranslation(
  all: readonly { id: string }[],
  preferences: MenuPreferences | null | undefined,
  fallback: string,
): string {
  return preferences?.favoriteTranslations.find((id) => all.some((t) => t.id === id)) ?? fallback;
}
