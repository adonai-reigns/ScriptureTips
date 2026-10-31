import { describe, expect, it } from "vitest";
import { parseTipnr } from "./names.ts";

const row = (...cols: string[]) => cols.join("\t");
const DASH = "–";

const text = [
  "Proper Nouns in the ESV\tpreamble that isn't a record",
  "$========== PERSON(s)",
  row(
    "Abraham@Gen.11.26-1Pe=H0085",
    "Man living at the time of the Patriarchs",
    "Terah@Gen.11.24-Luk +",
    "Nahor@Gen.11.26-",
    "Sarah@Gen.11.29-1Pe",
    "Isaac@Gen.17.19-Jas",
    "Early Patriarch",
    "#A man living at the time of the Patriarchs",
  ),
  row(DASH + " Named", "Abraham@Gen.11.26-1Pe", "H0085«H0085=אַבְרָהָם", "Abraham", "Gen.17.5"),
  row(DASH + " Named", "Abram|Abraham@Gen.11.26-1Pe", "H0087«H0087=אַבְרָם", "Abram", "Gen.11.26"),
  row(DASH + " Greek", "Abraham@Gen.11.26-1Pe", "G0011«G0011=Ἀβραάμ", "Abraham", "Mat.1.1"),
  row(
    DASH + " Total",
    "Abraham or Abram",
    "Abraham, Abram",
    "H0085, G0011, H0087",
    "Gen.11.26",
    "175",
  ),
  "@Briefest= Son of Terah",
  "@Brief= Patriarch, chosen by God to father His people",
  "@Short= Abraham was the patriarch whom God called.",
  "@Article= Abraham, initially named Abram, was a central figure.",
  "@Ambiguity=\t\t\t",
  "$========== PLACE",
  row(
    "Bethel@Gen.12.8-Hos=H1008G",
    "House of God",
    "",
    "",
    "",
    "",
    "",
    "#A city north of Jerusalem",
  ),
  "$========== EXCLUDED OTHER",
  row("Nothing@Gen.1.1-Rev=H0001", "Left out"),
].join("\n");

describe("TIPNR", () => {
  const parsed = parseTipnr(text);

  it("reads a record's name, kind and the numbers of all its forms", () => {
    const [abraham] = parsed.names;
    expect(abraham).toMatchObject({
      tipnrId: "Abraham@Gen.11.26-1Pe",
      name: "Abraham",
      kind: "person",
      strongs: ["H0085", "H0087", "G0011"],
    });
  });

  it("keeps the descriptions, flagged by the loader as AI-generated, and the family", () => {
    const [abraham] = parsed.names;
    expect(abraham?.description).toBe("Patriarch, chosen by God to father His people");
    expect(abraham?.summary).toBe("Abraham was the patriarch whom God called.");
    expect(abraham?.details).toMatchObject({
      parents: "Terah@Gen.11.24-Luk +",
      offspring: "Isaac@Gen.17.19-Jas",
      tribe: "Early Patriarch",
      briefest: "Son of Terah",
      article: "Abraham, initially named Abram, was a central figure.",
    });
  });

  it("reads each section's kind, and leaves out the excluded section", () => {
    expect(parsed.names.map((n) => [n.name, n.kind])).toEqual([
      ["Abraham", "person"],
      ["Bethel", "place"],
    ]);
    expect(parsed.skipped).toBe(1);
  });
});
