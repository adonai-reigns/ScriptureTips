// cspell:ignore Mengjps
import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { boundaryMismatches, diffWords, readZip, usfmWords, type Word } from "./verify.ts";

const ws = (text: string, ref = "1:1"): Word[] =>
  text.split(" ").map((word, i) => ({ word, ref, verseStart: i === 0 }));

/** A one-file zip archive with a deflated entry. */
function zip(name: string, content: string): Uint8Array {
  const nameBytes = new TextEncoder().encode(name);
  const data = deflateRawSync(new TextEncoder().encode(content));
  const local = new Uint8Array(30 + nameBytes.length + data.length);
  const lv = new DataView(local.buffer);
  lv.setUint32(0, 0x04034b50, true);
  lv.setUint16(8, 8, true);
  lv.setUint32(18, data.length, true);
  lv.setUint16(26, nameBytes.length, true);
  local.set(nameBytes, 30);
  local.set(data, 30 + nameBytes.length);
  const central = new Uint8Array(46 + nameBytes.length);
  const cv = new DataView(central.buffer);
  cv.setUint32(0, 0x02014b50, true);
  cv.setUint16(10, 8, true);
  cv.setUint32(20, data.length, true);
  cv.setUint16(28, nameBytes.length, true);
  cv.setUint32(42, 0, true);
  central.set(nameBytes, 46);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(10, 1, true);
  ev.setUint32(16, local.length, true);
  const out = new Uint8Array(local.length + central.length + end.length);
  out.set(local);
  out.set(central, local.length);
  out.set(end, local.length + central.length);
  return out;
}

describe("readZip", () => {
  it("reads a deflated entry", () => {
    const files = readZip(zip("33LAMengjps.usfm", "\\c 1"));
    expect(new TextDecoder().decode(files.get("33LAMengjps.usfm"))).toBe("\\c 1");
  });
});

describe("usfmWords", () => {
  it("drops notes, markers, Psalm book divisions and acrostic letters", () => {
    const usfm = "\\c 119\n\\ms BOOK V\n\\q1 \\v 1 ALEPH. Happy are \\nd LORD\\nd*\\f + \\ft x\\f*";
    expect(usfmWords(usfm).map((w) => w.word)).toEqual(["happy", "are", "lord"]);
  });

  it("treats the witness's original-verse markers as verse starts", () => {
    const words = usfmWords("\\c 3\n\\v 1 one two (3-2) three");
    expect(words.filter((w) => w.verseStart).map((w) => w.word)).toEqual(["one", "three"]);
  });

  it("compares compounds without their hyphens", () => {
    expect(usfmWords("\\c 1\n\\v 1 first-born — sons").map((w) => w.word)).toEqual([
      "firstborn",
      "sons",
    ]);
  });
});

describe("diffWords", () => {
  it("reports each differing run with context", () => {
    const { differences } = diffWords(
      ws("hide not thy face from me"),
      ws("hide not thy face far from me"),
    );
    expect(differences).toHaveLength(1);
    expect(differences[0]?.theirs.map((w) => w.word)).toEqual(["far"]);
    expect(differences[0]?.before).toBe("hide not thy face");
  });

  it("finds no differences in identical lists", () => {
    expect(diffWords(ws("a b c"), ws("a b c")).differences).toEqual([]);
  });
});

describe("boundaryMismatches", () => {
  it("reports a verse start that falls mid-verse in the witness", () => {
    const ours = [...ws("a b", "1:1"), ...ws("c d", "1:2")];
    const theirs = ws("a b c d", "1:1");
    const { alignment } = diffWords(ours, theirs);
    expect(boundaryMismatches(ours, theirs, alignment)).toEqual(["1:2 (witness 1:1)"]);
  });
});
