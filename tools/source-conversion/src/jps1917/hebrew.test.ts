import { describe, expect, it } from "vitest";
import type { BookInfo } from "./books.ts";
import { ACROSTICS, PORTIONS, restoreHebrew } from "./hebrew.ts";
import type { Event, ParsedBook } from "./parse.ts";

const book = (code: string, events: Event[]): ParsedBook => ({
  info: { heading: code, code, name: code, hebrew: "", chapters: [] } as BookInfo,
  events,
  notes: [],
  issues: [],
});
const lost = (source: string): Event => ({ kind: "lost-hebrew", source });
const verse = (number: number): Event => ({ kind: "verse", number });
const q: Event = { kind: "break", style: "q", stanza: false };
const text = (t: string): Event => ({ kind: "text", text: t });

describe("ACROSTICS", () => {
  it("holds the letters each chapter prints", () => {
    expect(ACROSTICS.get("PSA 25")).toHaveLength(20);
    expect(ACROSTICS.get("PSA 25")?.[4]).toBe("הו");
    expect(ACROSTICS.get("PSA 37")).not.toContain("ע");
    expect(ACROSTICS.get("PSA 145")).not.toContain("נ");
    expect(ACROSTICS.get("LAM 1")?.slice(15, 17)).toEqual(["ע", "פ"]);
    expect(ACROSTICS.get("LAM 2")?.slice(15, 17)).toEqual(["פ", "ע"]);
  });
});

describe("restoreHebrew", () => {
  it("restores a Torah portion name before the verse it begins", () => {
    const restored = restoreHebrew(
      book("GEN", [{ kind: "chapter", number: 6 }, lost(".."), verse(9)]),
    );
    expect(restored.events[1]).toEqual({ kind: "heading", style: "s2", text: "נח" });
    expect(restored.issues.filter((i) => i.includes("6:9"))).toEqual([]);
    expect(PORTIONS.size).toBe(49);
  });

  it("restores a Psalm book name above the English heading", () => {
    const restored = restoreHebrew(
      book("PSA", [lost("... ....."), { kind: "heading", style: "ms2", text: "BOOK I" }]),
    );
    expect(restored.events[0]).toEqual({ kind: "heading", style: "ms1", text: "ספר ראשון" });
  });

  it("drops the next book's title at the end of a book", () => {
    expect(restoreHebrew(book("RUT", [text("x"), lost("....")])).events).toEqual([text("x")]);
  });

  it("assigns margin letters in order and puts each after its verse number", () => {
    const events: Event[] = [{ kind: "chapter", number: 111 }];
    for (let v = 1; v <= 22; v++) events.push(lost("."), q, verse(v), text("line"));
    const restored = restoreHebrew(book("PSA", events));
    expect(restored.events.slice(1, 5)).toEqual([
      q,
      verse(1),
      { kind: "acrostic", letter: "א" },
      text("line"),
    ]);
    const letters = restored.events.flatMap((e) => (e.kind === "acrostic" ? [e.letter] : []));
    expect(letters.join("")).toBe("אבגדהוזחטיכלמנסעפצקרשת");
    // The other acrostic chapters aren't in this test book.
    expect(restored.issues.filter((i) => i.startsWith("PSA 111"))).toEqual([]);
  });

  it("prefixes Psalm 119's letter names with the Hebrew letter", () => {
    const restored = restoreHebrew(
      book("PSA", [
        { kind: "chapter", number: 119 },
        { kind: "heading", style: "qa", text: "ALEPH." },
      ]),
    );
    expect(restored.events[1]).toEqual({ kind: "heading", style: "qa", text: "א ALEPH." });
  });

  it("reports a chapter whose margin letters don't match the printing", () => {
    const restored = restoreHebrew(
      book("PRO", [{ kind: "chapter", number: 31 }, lost("."), verse(10)]),
    );
    expect(restored.issues).toEqual(["PRO 31: 1 acrostic letters found, the printing has 22"]);
  });

  it("reports Hebrew it can't place", () => {
    const restored = restoreHebrew(
      book("JOS", [{ kind: "chapter", number: 2 }, lost("..."), verse(1)]),
    );
    expect(restored.issues).toEqual(["JOS: unknown Hebrew before JOS 2:1"]);
  });
});
