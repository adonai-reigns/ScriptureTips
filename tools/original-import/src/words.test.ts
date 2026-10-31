import { describe, expect, it } from "vitest";
import { parseTagnt, parseTahot } from "./words.ts";

/** A table row: the columns joined by tabs. */
const row = (...cols: string[]) => cols.join("\t");
const hebrew = (ref: string, ...rest: string[]) => row(ref, ...rest);

describe("TAHOT", () => {
  const text = [
    "# Gen.1.1\tbe.re.Shit (בְּרֵאשִׁ֖ית)", // a header line, not a word
    "Eng (Heb) Ref & Type\tHebrew\tTransliteration",
    hebrew(
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
    hebrew(
      "Gen.1.1#07=L",
      "הָ/אָֽרֶץ\\׃",
      "ha./'A.retz",
      "the/ earth",
      "H9009/{H0776G}\\H9016",
      "HTd/Ncfsa",
      "",
      "",
      "H0776G",
      "",
      "",
      "H9009=ה=the/{H0776G=אֶ֫רֶץ=: country;_planet»land:2_country;_planet}\\H9016=׃=verseEnd",
    ),
    // A name: the tag after » is the individual, in TIPNR's unified form.
    hebrew(
      "Gen.11.26#05=L",
      "אַבְרָ֔ם",
      "'av.Ram",
      "Abram",
      "{H0087}",
      "HNpm",
      "",
      "",
      "H0087",
      "",
      "",
      "{H0087=אַבְרָם=Abram»Abraham@Gen.11.26-1Pe}",
    ),
    // The Hebrew numbering is the one in brackets.
    hebrew(
      "Isa.9.1(8.23)#01=L",
      "הַ/גָּלִיל",
      "ha./ga.Lil",
      "the/ Galilee",
      "H9009/{H1551}",
      "HTd/Np",
      "",
      "",
      "H1551",
      "",
      "",
      "H9009=ה=the/{H1551=גָּלִיל=Galilee}",
    ),
    // A Qere standing for no word, and a variant reading that isn't the main text.
    hebrew("Rut.3.12#05=Q(K)", "", "[ ]", "[ ]", "", "", "", "", "H0518B"),
    hebrew("Job.36.3#04=A(l)", "וּ/לְ", "u./le.", "and/ to", "H9002/{H5921A}", "HC/R"),
    hebrew("Zzz.1.1#01=L", "א", "a", "x", "{H0001}", "HNcmsa"),
  ].join("\n");
  const parsed = parseTahot(text);

  it("reads a word's root as its lemma, with the prefixes it carries", () => {
    const [first] = parsed.words;
    expect(first).toMatchObject({
      book: "Gen",
      chapter: 1,
      verse: 1,
      position: 1,
      reading: "L",
      surface: "בְּרֵאשִׁ֖ית",
      transliteration: "be.re.Shit",
      gloss: "in beginning",
      language: "heb",
      lemmaKey: "H7225G",
      lemmaBase: "H7225",
      headword: "רֵאשִׁית",
      lemmaGloss: "beginning",
      partOfSpeech: "noun",
      morphology: "HR/Ncfsa",
    });
    expect(first?.affixes).toEqual([{ strong: "H9003", form: "ב", gloss: "in", role: "prefix" }]);
  });

  it("leaves punctuation out of the word and the affixes", () => {
    expect(parsed.words[1]).toMatchObject({ surface: "הָאָֽרֶץ׃", lemmaKey: "H0776G" });
    expect(parsed.words[1]?.affixes.map((a) => a.strong)).toEqual(["H9009"]);
  });

  it("links a name to its individual, and keeps the lemma's gloss as the form translated", () => {
    expect(parsed.words[2]).toMatchObject({
      lemmaKey: "H0087",
      lemmaGloss: "Abram",
      properName: "Abraham@Gen.11.26-1Pe",
      partOfSpeech: "proper noun",
    });
  });

  it("numbers a verse the Hebrew way where the source gives both", () => {
    expect(parsed.words[3]).toMatchObject({ book: "Isa", chapter: 8, verse: 23 });
  });

  it("leaves out variant readings and empty Qere slots, and reports what it can't place", () => {
    expect(parsed.words).toHaveLength(4);
    expect(parsed.skipped).toEqual({ "empty Qere slot": 1, "variant reading": 1 });
    expect(parsed.problems).toEqual(["Zzz: unknown book code"]);
  });
});

describe("TAGNT", () => {
  const editions = "NA28+NA27+Tyn+SBL+WH+Treg+TR+Byz";
  const text = [
    row(
      "Mat.1.1#01=NKO",
      "Βίβλος (Biblos)",
      "[The] book",
      "G0976=N-NSF",
      "βίβλος=book",
      editions,
      "",
      "",
      "Libro",
      "book",
      "#01",
      "G0976",
    ),
    row(
      "Mat.1.1#03=NKO",
      "Ἰησοῦ (Iēsou)",
      "of Jesus",
      "G2424G=N-GSM-P",
      "Ἰησοῦς=Jesus/Joshua",
      editions,
      "",
      "",
      "de Jesús",
      "Jesus»Jesus|Jesus@Mat.1.1",
    ),
    row("Mat.2.3#09=n(K)O", "ἄλλο (allo)", "other", "G0243=A-NSN", "ἄλλος=other", "NA28+NA27"),
    row(
      "Act.24.12#12=N(k)O",
      "ἐπίστασιν (epistasin)",
      "obstruction",
      "G20447=N-ASF",
      "x=y",
      editions,
    ),
  ].join("\n");
  const parsed = parseTagnt(text);

  it("reads the Greek, its lemma, part of speech and the editions that have it", () => {
    expect(parsed.words[0]).toMatchObject({
      book: "Matt",
      chapter: 1,
      verse: 1,
      position: 1,
      reading: "NKO",
      surface: "Βίβλος",
      transliteration: "Biblos",
      gloss: "[The] book",
      language: "grc",
      lemmaKey: "G0976",
      headword: "βίβλος",
      lemmaGloss: "book",
      partOfSpeech: "noun",
      morphology: "N-NSF",
    });
    expect(parsed.words[0]?.editions).toContain("SBL");
  });

  it("reads a proper name's kind from its grammar suffix, and the extended number", () => {
    expect(parsed.words[1]).toMatchObject({
      lemmaKey: "G2424G",
      lemmaBase: "G2424",
      nameKind: "person",
    });
  });

  it("never reads the Spanish or sub-meaning columns", () => {
    expect(JSON.stringify(parsed.words)).not.toContain("Libro");
    expect(JSON.stringify(parsed.words)).not.toContain("Jesus@Mat");
  });

  it("leaves out a word that isn't in the SBLGNT, Byzantine or TR, and reports a bad number", () => {
    expect(parsed.words).toHaveLength(2);
    expect(parsed.skipped).toEqual({ "not in SBL, Byzantine or TR": 1 });
    expect(parsed.problems).toEqual(['Act.24.12#12: no Strong\'s number in "G20447=N-ASF"']);
  });
});
