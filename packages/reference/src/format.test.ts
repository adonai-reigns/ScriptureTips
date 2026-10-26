import { parseOsisPassage } from "@scripturetips/passage";
import { describe, expect, it } from "vitest";
import { formatPassage } from "./format.ts";
import { KJV_VERSES } from "./test-support/kjv.ts";

const full = (osis: string) => formatPassage(parseOsisPassage(osis), { verses: KJV_VERSES });
const short = (osis: string) =>
  formatPassage(parseOsisPassage(osis), { verses: KJV_VERSES, style: "short" });

describe("formatting a passage", () => {
  it.each([
    ["John.3.16", "John 3:16", "John 3:16"],
    ["John.3.16-John.3.18", "John 3:16–18", "John 3:16–18"],
    ["Joel.2.28-Joel.3.1", "Joel 2:28–3:1", "Joel 2:28–3:1"],
    ["1Cor.13.4-1Cor.13.7", "1 Corinthians 13:4–7", "1 Cor 13:4–7"],
    ["Rev.13.1!a", "Revelation 13:1a", "Rev 13:1a"],
    ["Ps.23.0-Ps.23.6", "Psalm 23", "Ps 23"],
    ["Ps.1.1-Ps.3.8", "Psalms 1–3", "Ps 1–3"],
    ["Ps.3.0-Ps.3.2", "Psalm 3:title–2", "Ps 3:title–2"],
    ["Ps.3.1-Ps.3.8", "Psalm 3:1–8", "Ps 3:1–8"],
    ["Jude.1.3", "Jude 3", "Jude 3"],
    ["Jude.1.3-Jude.1.5", "Jude 3–5", "Jude 3–5"],
    ["Jude.1.1-Jude.1.25", "Jude", "Jude"],
    ["Gen.1.1-Gen.50.26", "Genesis", "Gen"],
    ["Song.2.1", "Song of Songs 2:1", "Song 2:1"],
    ["AddPs.1.3", "Psalm 151:3", "Ps 151:3"],
  ])("%s → %s, %s", (osis, expectedFull, expectedShort) => {
    expect(full(osis)).toBe(expectedFull);
    expect(short(osis)).toBe(expectedShort);
  });

  it("writes chapters out in verses without verse counts", () => {
    expect(formatPassage(parseOsisPassage("Ps.23.0-Ps.23.6"))).toBe("Psalm 23:title–6");
  });
});
