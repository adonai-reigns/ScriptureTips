import { describe, expect, it } from "vitest";
import { type AvailableBook, arrangeBooks, neighbors, readingOrder } from "./books.ts";

const book = (osis: string, chapters = [1, 2]): AvailableBook => ({ osis, chapters });
/** A translation with the Apocrypha, as the WEB has it. */
const web = [
  book("Gen"),
  book("Esth"),
  book("Mal"),
  book("Matt"),
  book("Rev"),
  book("Tob"),
  book("EsthGr", [10, 11]),
  book("1Macc"),
  book("PrMan", [1]),
  book("PssSol", [1]),
];
const ids = (sections: ReturnType<typeof arrangeBooks>) =>
  sections.map((s) => [
    s.id,
    s.books.map((b) => [b.osis, ...b.parts.map((p) => `+${p.osis}`)].join("")),
  ]);

describe("vision §3.4: books in the reader's canon order", () => {
  it("Protestant: the Apocrypha after the New Testament, as additional writings", () => {
    expect(ids(arrangeBooks(web, "protestant"))).toEqual([
      ["ot", ["Gen", "Esth", "Mal"]],
      ["nt", ["Matt", "Rev"]],
      ["additional", ["Tob", "EsthGr", "1Macc", "PrMan", "PssSol"]],
    ]);
  });

  it("Catholic: Tobit and Maccabees in the Old Testament, Greek Esther within Esther", () => {
    expect(ids(arrangeBooks(web, "catholic"))).toEqual([
      ["ot", ["Gen", "Tob", "Esth+EsthGr", "1Macc", "Mal"]],
      ["nt", ["Matt", "Rev"]],
      ["additional", ["PrMan", "PssSol"]],
    ]);
  });

  it("no canon: books the traditions disagree on are grouped on their own", () => {
    expect(ids(arrangeBooks(web, null))).toEqual([
      ["ot", ["Gen", "Esth", "Mal"]],
      ["nt", ["Matt", "Rev"]],
      ["varies", ["Tob", "EsthGr", "1Macc"]],
      ["additional", ["PrMan", "PssSol"]],
    ]);
  });

  it("reads on across books and into a book's parts", () => {
    const order = readingOrder(arrangeBooks(web, "catholic"));
    expect(neighbors(order, "Esth", 2, 2)).toEqual({
      previous: { osis: "Esth", chapter: 1 },
      next: { osis: "EsthGr", chapter: 10 },
    });
    expect(neighbors(order, "Mal", 1, 2)).toEqual({
      previous: { osis: "1Macc", chapter: 2 },
      next: { osis: "Matt", chapter: 1 },
    });
    expect(neighbors(order, "Gen", 1, 1)).toEqual({ next: { osis: "Gen", chapter: 2 } });
    expect(neighbors(order, "Nope", 1, 1)).toEqual({});
  });
});
