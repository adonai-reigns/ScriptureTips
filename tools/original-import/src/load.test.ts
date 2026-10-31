import {
  type Database,
  lemma,
  lexiconEntry,
  properName,
  token,
  translation,
  translationAlignment,
  verseText,
} from "@scripturetips/db";
import { testDatabase } from "@scripturetips/db/test-support";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { alignTranslation } from "./align.ts";
import { loadOriginal, nameKindOf, type OriginalInputs } from "./load.ts";
import { parseTagnt, parseTahot } from "./words.ts";

let db: Database;
let drop: () => Promise<void>;
beforeAll(async () => {
  ({ db, drop } = await testDatabase());
});
afterAll(() => drop());

const row = (...cols: string[]) => cols.join("\t");

const hebrewRows = [
  row(
    "Gen.1.1#01=L",
    "בְּ/רֵאשִׁ֖ית",
    "be./re.Shit",
    "in/ beginning",
    "H9003/{H7225G}",
    "HR/Ncfsa",
    "",
    "",
    "H7225G",
    "",
    "",
    "H9003=ב=in/{H7225G=רֵאשִׁית=: beginning»first:1_beginning}",
  ),
  row(
    "Gen.1.1#03=L",
    "אֱלֹהִ֑ים",
    "'E.lo.Him",
    "God",
    "{H0430G}",
    "HNcmpa",
    "",
    "",
    "H0430G",
    "",
    "",
    "{H0430G=אֱלֹהִים=God»LORD@Gen.1.1-Heb}",
  ),
  row(
    "Gen.1.1#04=L",
    "אֵ֥ת",
    "'et",
    "<obj.>",
    "{H0853}",
    "HTo",
    "",
    "",
    "H0853",
    "",
    "",
    "{H0853=אֵת=[Obj.]}",
  ),
  row(
    "Gen.1.1#06=L",
    "וְאֵ֥ת",
    "ve.'Et",
    "and/ <obj.>",
    "H9002/{H0853}",
    "HC/To",
    "",
    "",
    "H0853",
    "",
    "",
    "H9002=ו=and/{H0853=אֵת=[Obj.]}",
  ),
].join("\n");

const greekRows = row("Jhn.1.1#01=NKO", "Ἐν (En)", "In", "G1722=PREP", "ἐν=in", "NA28+SBL+TR+Byz");

const inputs = (over: Partial<OriginalInputs> = {}): OriginalInputs => ({
  strongsHebrew: [
    {
      language: "heb",
      strong: "H0430",
      headword: "אֱלֹהִים",
      partOfSpeech: "n-m",
      body: { usage: "God" },
    },
    {
      language: "heb",
      strong: "H0085",
      headword: "אַבְרָהָם",
      partOfSpeech: "n-pr-m",
      body: {},
    },
    { language: "heb", strong: "H0068", headword: "אֶבֶן", partOfSpeech: "n-f", body: {} },
  ],
  strongsGreek: [{ language: "grc", strong: "G1722", headword: "ἐν", body: { definition: "in" } }],
  bdb: [{ id: "a.ab.ab", headword: "אֱלֹהִים", text: "God", definitions: ["God"] }],
  bdbIndex: new Map([["H0430", ["a.ab.ab"]]]),
  abbott: {
    entries: [{ strong: "G1722", headword: "ἐν", glosses: ["in"], text: "ἐν in" }],
    unlinked: 0,
  },
  names: [
    {
      tipnrId: "LORD@Gen.1.1-Heb",
      name: "LORD",
      kind: "other",
      strongs: ["H0430G"],
      details: {},
    },
    {
      tipnrId: "Stone@Gen.28.18-Gen",
      name: "Stone",
      kind: "place",
      strongs: ["H0068"],
      details: {},
    },
    {
      tipnrId: "Abraham@Gen.11.26-1Pe",
      name: "Abraham",
      kind: "person",
      strongs: ["H0085"],
      details: {},
    },
  ],
  hebrew: parseTahot(hebrewRows),
  greek: parseTagnt(greekRows),
  ...over,
});

describe("loadOriginal", () => {
  it("loads lemmas, with the extended ones under their Strong's number's base lemma", async () => {
    const report = await loadOriginal(db, inputs());
    expect(report.tokens).toEqual({ tahot: 4, tagnt: 1 });
    const lemmas = await db.select().from(lemma);
    const byKey = new Map(lemmas.map((l) => [l.key, l]));
    expect(byKey.get("H7225G")).toMatchObject({
      strong: "H7225",
      extendedStrong: "H7225G",
      headword: "רֵאשִׁית",
      gloss: "beginning",
      partOfSpeech: "noun",
    });
    expect(byKey.get("H7225G")?.baseLemmaId).toBe(byKey.get("H7225")?.id);
    expect(byKey.get("H7225")?.baseLemmaId).toBeNull();
    // The Greek dictionary's number is the one the words use (G0976, not G00976).
    expect(byKey.get("G1722")).toMatchObject({ language: "grc", headword: "ἐν" });
  });

  it("hangs each dictionary's entries from the base lemma of the Strong's number", async () => {
    const entries = await db
      .select({ key: lemma.key, body: lexiconEntry.body })
      .from(lexiconEntry)
      .innerJoin(lemma, eq(lemma.id, lexiconEntry.lemmaId));
    expect(entries.map((e) => e.key).sort()).toEqual([
      "G1722",
      "G1722",
      "H0068",
      "H0085",
      "H0430",
      "H0430",
    ]);
  });

  it("places each word in the canonical scheme, and links names to their individual", async () => {
    const tokens = await db.select().from(token).orderBy(token.position);
    const first = tokens.find((t) => t.book === "Gen" && t.position === 1);
    expect(first?.canonical).toEqual(["Gen.1.1"]);
    expect(first?.canonicalRange).not.toBeNull();
    expect(first?.affixes).toEqual([{ strong: "H9003", form: "ב", gloss: "in", role: "prefix" }]);
    const names = await db.select().from(properName);
    const god = tokens.find((t) => t.position === 3);
    expect(names.find((n) => n.id === god?.properNameId)?.tipnrId).toBe("LORD@Gen.1.1-Heb");
    // A common word isn't a name because a name is tagged with its number ("God" is H0430G,
    // and a place called "Stone" uses the number of the common word "stone", H0068).
    const [elohim] = await db.select().from(lemma).where(eq(lemma.key, "H0430G"));
    expect(elohim?.nameKind).toBeNull();
    expect(elohim?.properNameId).toBeNull();
    const [stone] = await db.select().from(lemma).where(eq(lemma.key, "H0068"));
    expect(stone?.nameKind).toBeNull();
    // A proper noun with exactly one name takes it, and its kind.
    const [abraham] = await db.select().from(lemma).where(eq(lemma.key, "H0085"));
    expect(abraham?.nameKind).toBe("person");
    expect(names.find((n) => n.id === abraham?.properNameId)?.tipnrId).toBe(
      "Abraham@Gen.11.26-1Pe",
    );
  });

  it("replaces everything on a second load, leaving nothing stale", async () => {
    await loadOriginal(
      db,
      inputs({ hebrew: parseTahot(hebrewRows.split("\n").slice(0, 2).join("\n")) }),
    );
    expect(await db.select().from(token).where(eq(token.book, "Gen"))).toHaveLength(2);
    expect((await db.select().from(lemma)).some((l) => l.key === "H0853")).toBe(false);
    await loadOriginal(db, inputs());
    expect(await db.select().from(token)).toHaveLength(5);
  });
});

describe("alignTranslation", () => {
  const w = (text: string, strong?: string) => ({
    type: "char",
    marker: "w",
    content: [text],
    ...(strong ? { attributes: { strong } } : {}),
  });

  it("links each tagged word to its lemma, and to its token where the counts match", async () => {
    await loadOriginal(db, inputs());
    const [t] = await db
      .insert(translation)
      .values({
        catalogId: "kjv-test",
        abbreviation: "KJVT",
        name: "KJV test",
        language: "en",
        direction: "ltr",
        scheme: "kjv",
        licenseKey: "public-domain",
      })
      .returning({ id: translation.id });
    const [v] = await db
      .insert(verseText)
      .values({
        translationId: t?.id ?? "",
        book: "Gen",
        chapter: 1,
        verse: 1,
        canonical: ["Gen.1.1"],
        mapping: "same",
        canonicalRange: { start: 1001001, end: 1001001 },
        headings: [],
        content: [
          "In the ",
          w("beginning", "H7225"),
          " ",
          w("God", "H0430"),
          " and ",
          w("the"),
          " ",
          w("also", "H0853"),
          " ",
          w("and", "H0853"),
          " ",
          w("unknown", "H5555"),
        ],
      })
      .returning({ id: verseText.id });

    const report = await alignTranslation(db, "kjv-test");
    expect(report).toMatchObject({ taggedWords: 5, lemmaLinked: 4, tokenLinked: 4 });
    const rows = await db
      .select({
        position: translationAlignment.position,
        strong: translationAlignment.strong,
        lemmaId: translationAlignment.lemmaId,
        tokenId: translationAlignment.tokenId,
      })
      .from(translationAlignment)
      .where(eq(translationAlignment.verseTextId, v?.id ?? ""))
      .orderBy(translationAlignment.position);
    expect(rows.map((r) => [r.position, r.strong, r.lemmaId !== null, r.tokenId !== null])).toEqual(
      [
        [0, "H7225", true, true],
        [1, "H0430", true, true],
        [3, "H0853", true, true],
        [4, "H0853", true, true],
        [5, "H5555", false, false],
      ],
    );
    // Aligning again replaces the rows.
    await alignTranslation(db, "kjv-test");
    expect(await db.select().from(translationAlignment)).toHaveLength(5);
  });
});

describe("nameKindOf", () => {
  it("reads a person or a place from Strong's part of speech, and neither where it is both", () => {
    expect(nameKindOf("n-pr-m")).toBe("person");
    expect(nameKindOf("n-pr-f")).toBe("person");
    expect(nameKindOf("n-pr-loc")).toBe("place");
    expect(nameKindOf("n-pr-m n-pr-loc")).toBeUndefined();
    expect(nameKindOf("n-pr")).toBeUndefined();
    expect(nameKindOf("n-m")).toBeUndefined();
    expect(nameKindOf(undefined)).toBeUndefined();
  });
});
