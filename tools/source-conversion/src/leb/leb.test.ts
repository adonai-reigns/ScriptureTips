import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { citeTarget } from "./books.ts";
import { bookToUsfm } from "./usfm.ts";
import { firstDifference, usfmWords, xmlWords } from "./verify.ts";
import { parseXml, type XmlElement } from "./xml.ts";

const book = (xml: string): XmlElement => parseXml(xml);
const usfm = (xml: string) => bookToUsfm(book(xml), "test");
const lines = (xml: string) => usfm(xml).usfm.trimEnd().split("\n").slice(3);

describe("parseXml", () => {
  it("reads elements, attributes, text and entities", () => {
    const root = parseXml('<a x="1">one &amp; <b>two</b><c /></a>');
    expect(root).toEqual({
      name: "a",
      attributes: { x: "1" },
      children: [
        "one & ",
        { name: "b", attributes: {}, children: ["two"] },
        { name: "c", attributes: {}, children: [] },
      ],
    });
  });

  it("rejects a closing tag that doesn't match", () => {
    expect(() => parseXml("<a><b></a>")).toThrow();
  });
});

describe("citeTarget", () => {
  it("reads a verse, a range and a chapter", () => {
    expect(citeTarget("BibleLEB2: Ge 1:1")).toBe("GEN 1:1");
    expect(citeTarget("BibleLEB2: Ge 1:1–2:3")).toBe("GEN 1:1-2:3");
    expect(citeTarget("BibleLEB2: Ps 23")).toBe("PSA 23");
  });

  it("reads a single-chapter book's number as a verse", () => {
    expect(citeTarget("BibleLEB2: Ob 3")).toBe("OBA 1:3");
  });

  it("returns undefined for an unknown book", () => {
    expect(citeTarget("BibleLEB2: Xx 1:1")).toBeUndefined();
  });
});

describe("bookToUsfm", () => {
  it("writes chapters, headings, paragraphs and character styles", () => {
    expect(
      lines(
        '<book id="Ge"><chapter id="Ge 1"><pericope>The Creation</pericope><p><verse-number id="Ge 1:1">1</verse-number>In the beginning <supplied>was</supplied> it.<note>Or “And”</note></p><p /></chapter></book>',
      ),
    ).toEqual([
      "\\c 1",
      "\\s1 The Creation",
      "\\p \\v 1 In the beginning \\add was\\add* it.\\f + \\ft Or “And”\\f*",
    ]);
  });

  it("writes a Psalm title as \\d", () => {
    expect(
      lines(
        '<book id="Ps"><chapter id="Ps 3"><ul><li1><verse-number id="Ps 3:title">title</verse-number>A psalm of David.</li1><li1><verse-number id="Ps 3:1">1</verse-number>Yahweh,</li1></ul></chapter></book>',
      ),
    ).toEqual(["\\c 3", "\\d A psalm of David.", "\\q1 \\v 1 Yahweh,"]);
  });

  describe("idioms (domain-model §2.6)", () => {
    it("writes a span as \\w with a numbered x-idiom attribute", () => {
      const out = lines(
        '<book id="Ge"><chapter id="Ge 2"><p><verse-number id="Ge 2:23">23</verse-number>“<idiom-start />She is now<idiom-end /><note>Literally “this one the time”</note> bone</p></chapter></book>',
      );
      expect(out[1]).toBe(
        '\\p \\v 23 “\\w She is now|x-idiom="1"\\w*\\f + \\ft Literally “this one the time”\\f* bone',
      );
    });

    it("nests character styles inside the span", () => {
      const out = lines(
        '<book id="Ge"><chapter id="Ge 2"><p><verse-number id="Ge 2:3">3</verse-number><idiom-start />of creating that <supplied>there was</supplied> to do<idiom-end />.</p></chapter></book>',
      );
      expect(out[1]).toBe(
        '\\p \\v 3 \\w of creating that \\+add there was\\+add* to do|x-idiom="1"\\w*.',
      );
    });

    it("splits a span across a line and a verse number, keeping its number", () => {
      const out = lines(
        '<book id="Ho"><chapter id="Ho 4"><ul><li1><verse-number id="Ho 4:10">10</verse-number>Yahweh <idiom-start />to devote themselves to </li1><li2><verse-number id="Ho 4:11">11</verse-number>whoredom<idiom-end />.</li2></ul></chapter></book>',
      );
      expect(out.slice(1)).toEqual([
        '\\q1 \\v 10 Yahweh \\w to devote themselves to |x-idiom="1"\\w*',
        '\\q2 \\v 11 \\w whoredom|x-idiom="1"\\w*.',
      ]);
    });

    it("reports a span that never ends", () => {
      const result = usfm(
        '<book id="Ge"><chapter id="Ge 1"><p><verse-number id="Ge 1:1">1</verse-number><idiom-start />words</p></chapter></book>',
      );
      expect(result.issues).toEqual(["GEN: an idiom never ends"]);
    });
  });

  it("keeps every word of the XML", () => {
    const xml =
      '<book id="Ge"><chapter id="Ge 1"><pericope>Head</pericope><p><verse-number id="Ge 1:1">1</verse-number>One <idiom-start />two <supplied>three</supplied><idiom-end /><note>Literally “four”</note></p></chapter></book>';
    expect(firstDifference(xmlWords(book(xml)), usfmWords(usfm(xml).usfm))).toBeUndefined();
  });
});

const SOURCE = "/source-texts/lexham-english-bible/LEB.xml";

describe.skipIf(!existsSync(SOURCE))("LEB conversion", () => {
  it("converts all 66 books with every word kept and no issues", () => {
    const root = parseXml(readFileSync(SOURCE, "utf8"));
    const books = root.children.filter(
      (n): n is XmlElement => typeof n !== "string" && n.name === "book",
    );
    expect(books).toHaveLength(66);
    for (const b of books) {
      const result = bookToUsfm(b, "Lexham English Bible");
      expect(result.issues).toEqual([]);
      expect(firstDifference(xmlWords(b), usfmWords(result.usfm))).toBeUndefined();
    }
  });
});
