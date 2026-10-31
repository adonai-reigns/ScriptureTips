import { describe, expect, it } from "vitest";
import {
  parseAbbottSmith,
  parseBdb,
  parseLexicalIndex,
  parseStrongsGreek,
  parseStrongsHebrew,
} from "./dictionary.ts";

describe("Strong's Hebrew", () => {
  const xml = `<lexicon><entry id="H1"><w pos="n-m" pron="awb" xlit="ʼâb" xml:lang="heb">אָב</w>
    <source>a primitive word;</source><meaning><def>father</def>, in a literal sense</meaning>
    <usage>chief, (fore-) father.</usage></entry>
    <entry id="H2"><w pos="n-m" xlit="ʼab" xml:lang="arc">אַב</w><usage>father.</usage></entry></lexicon>`;
  it("reads the number, headword, transliteration, part of speech and parts", () => {
    const [first, second] = parseStrongsHebrew(xml);
    expect(first).toEqual({
      language: "heb",
      strong: "H0001",
      headword: "אָב",
      transliteration: "ʼâb",
      partOfSpeech: "n-m",
      body: {
        source: "a primitive word;",
        meaning: "father, in a literal sense",
        usage: "chief, (fore-) father.",
      },
    });
    expect(second?.language).toBe("arc");
  });
});

describe("Strong's Greek", () => {
  const xml = `<strongsdictionary><prologue>x</prologue><entries><entry strongs="00976">
    <strongs>976</strongs><greek BETA="BI/BLOS" unicode="βίβλος" translit="biblos"/>
    <pronunciation strongs="bib'-los"/><strongs_derivation>properly the inner bark of a papyrus;</strongs_derivation>
    <strongs_def> a scroll</strongs_def><kjv_def>book.</kjv_def></entry></entries></strongsdictionary>`;
  it("reads the Greek, transliteration, derivation, definition and KJV rendering", () => {
    expect(parseStrongsGreek(xml)).toEqual([
      {
        language: "grc",
        strong: "G0976",
        headword: "βίβλος",
        transliteration: "biblos",
        body: {
          pronunciation: "bib'-los",
          derivation: "properly the inner bark of a papyrus;",
          definition: "a scroll",
          kjv: "book.",
        },
      },
    ]);
  });
});

describe("Brown-Driver-Briggs and its lexical index", () => {
  it("reads entries as plain text with their marked definitions, leaving the project's status out", () => {
    const [e] = parseBdb(`<bdb><entry id="a.ab.ab"><w>אֵב</w> <pos>n.m</pos> <def>freshness</def>,
      <ref r="Job.8.12">Jb 8:12</ref><status p="1">done</status></entry></bdb>`);
    expect(e).toEqual({
      id: "a.ab.ab",
      headword: "אֵב",
      partOfSpeech: "n.m",
      text: "אֵב n.m freshness, Jb 8:12",
      definitions: ["freshness"],
    });
  });

  it("maps Strong's numbers to BDB entries, ignoring numbers with letters", () => {
    const index =
      parseLexicalIndex(`<index><entry id="aac"><xref bdb="a.ae.ab" strong="1" twot="4a"/></entry>
      <entry id="aad"><xref bdb="a.ab.aa" twot="1"/></entry>
      <entry id="aae"><xref bdb="a.ab.ae" strong="5"/><xref bdb="a.ab.af" strong="5a"/></entry></index>`);
    expect([...index]).toEqual([
      ["H0001", ["a.ae.ab"]],
      ["H0005", ["a.ab.ae"]],
    ]);
  });
});

describe("Abbott-Smith", () => {
  const xml = `<TEI><entry n="Ἀαρών|G2"><form><orth>Ἀαρών</orth></form><sense><gloss>Aaron</gloss> (<ref osisRef="Exod.4.14">Ex 4:14</ref>)</sense></entry>
    <entry n="ἀβαρής|G4"><sense><gloss>not burdensome</gloss></sense></entry>
    <entry n="εἰ"><sense><gloss>if</gloss></sense></entry></TEI>`;
  it("links an entry to its Strong's number, and counts those with none", () => {
    const { entries, unlinked } = parseAbbottSmith(xml);
    expect(entries.map((e) => [e.strong, e.headword, e.glosses])).toEqual([
      ["G0002", "Ἀαρών", ["Aaron"]],
      ["G0004", "ἀβαρής", ["not burdensome"]],
    ]);
    expect(unlinked).toBe(1);
  });
});
