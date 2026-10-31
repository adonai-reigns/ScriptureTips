import { describe, expect, it } from "vitest";
import { defaultTranslation, type MenuPreferences, translationOptions } from "./menu.ts";

const all = ["a", "b", "c", "d"].map((id) => ({
  id,
  abbreviation: id.toUpperCase(),
  name: `Name ${id}`,
}));
const preferences = (p: Partial<MenuPreferences>): MenuPreferences => ({
  favoriteTranslations: [],
  otherTranslations: [],
  favoritesOnly: false,
  ...p,
});
const ids = (o: { id: string }[]) => o.map((x) => x.id).join("-");
const more = (o: { id: string; more?: true }[]) =>
  o
    .filter((x) => x.more)
    .map((x) => x.id)
    .join("-");

describe("vision §3: favorite translations in menus", () => {
  it("leaves the order alone when signed out or nothing is chosen", () => {
    expect(ids(translationOptions(all, null))).toBe("a-b-c-d");
    expect(ids(translationOptions(all, preferences({})))).toBe("a-b-c-d");
    expect(translationOptions(all, null)[0]?.label).toBe("A: Name a");
  });

  it("puts favorites first in their order, then the rest in the order given, then new ones", () => {
    const o = translationOptions(
      all,
      preferences({ favoriteTranslations: ["c", "a"], otherTranslations: ["d"] }),
    );
    expect(ids(o)).toBe("c-a-d-b");
    expect(more(o)).toBe("");
  });

  it("marks the rest as more when only favorites are wanted, except what is kept", () => {
    const p = preferences({ favoriteTranslations: ["b"], favoritesOnly: true });
    expect(more(translationOptions(all, p))).toBe("a-c-d");
    expect(more(translationOptions(all, p, ["c"]))).toBe("a-d");
  });

  it("ignores favorites-only with no favorites, and IDs that are no longer loaded", () => {
    expect(more(translationOptions(all, preferences({ favoritesOnly: true })))).toBe("");
    const p = preferences({ favoriteTranslations: ["gone"], favoritesOnly: true });
    expect(more(translationOptions(all, p))).toBe("");
    expect(
      ids(translationOptions(all, preferences({ otherTranslations: ["gone", "c", "c"] }))),
    ).toBe("c-a-b-d");
  });

  it("starts from the first favorite that is loaded, else the fallback", () => {
    expect(
      defaultTranslation(all, preferences({ favoriteTranslations: ["gone", "d"] }), "leb"),
    ).toBe("d");
    expect(defaultTranslation(all, preferences({}), "leb")).toBe("leb");
    expect(defaultTranslation(all, null, "leb")).toBe("leb");
  });
});
