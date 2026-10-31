import { describe, expect, it } from "vitest";
import { child, descendants, parseXml, textOf } from "./xml.ts";

describe("parseXml", () => {
  it("reads elements, attributes, text and entities, skipping the DOCTYPE and comments", () => {
    const root = parseXml(`<?xml version="1.0"?>
<!DOCTYPE d [ <!ELEMENT d (e)+> <!ATTLIST e id CDATA #REQUIRED> ]>
<d><!-- a comment --><e id="1" xml:lang='heb'>a &amp; b &#x5D0;<w/> <![CDATA[<raw>]]></e></d>`);
    expect(root.name).toBe("d");
    const e = child(root, "e");
    expect(e?.attrs).toEqual({ id: "1", "xml:lang": "heb" });
    expect(textOf(e as never)).toBe("a & b א <raw>");
  });

  it("finds descendants in document order", () => {
    const root = parseXml("<a><b n='1'><b n='2'/></b><c><b n='3'/></c></a>");
    expect(descendants(root, "b").map((b) => b.attrs["n"])).toEqual(["1", "2", "3"]);
  });

  it("throws on a tag that doesn't close", () => {
    expect(() => parseXml("<a><b></a>")).toThrow();
    expect(() => parseXml("<a><b>")).toThrow();
  });
});
