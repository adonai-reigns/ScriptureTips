import { describe, expect, it } from "vitest";
import { BOOKS, bookByNumber, bookByOsis, bookByUsfm, MAX_BOOK_NUMBER } from "./books.ts";

describe("book registry", () => {
  it("numbers the Protestant canon 1–66 in order, then additional writings", () => {
    expect(bookByOsis("Gen")?.number).toBe(1);
    expect(bookByOsis("Mal")?.number).toBe(39);
    expect(bookByOsis("Matt")?.number).toBe(40);
    expect(bookByOsis("Rev")?.number).toBe(66);
    expect(bookByOsis("Tob")?.number).toBe(67);
    expect(BOOKS.filter((b) => b.group === "ot")).toHaveLength(39);
    expect(BOOKS.filter((b) => b.group === "nt")).toHaveLength(27);
  });

  // The numbers are stored inside every passage ordinal. If this snapshot changes, existing
  // data would point at the wrong books: append new books instead of editing this list.
  it("never renumbers a book", () => {
    expect(BOOKS.map((b) => `${b.number}:${b.osis}`).join(" ")).toMatchInlineSnapshot(
      `"1:Gen 2:Exod 3:Lev 4:Num 5:Deut 6:Josh 7:Judg 8:Ruth 9:1Sam 10:2Sam 11:1Kgs 12:2Kgs 13:1Chr 14:2Chr 15:Ezra 16:Neh 17:Esth 18:Job 19:Ps 20:Prov 21:Eccl 22:Song 23:Isa 24:Jer 25:Lam 26:Ezek 27:Dan 28:Hos 29:Joel 30:Amos 31:Obad 32:Jonah 33:Mic 34:Nah 35:Hab 36:Zeph 37:Hag 38:Zech 39:Mal 40:Matt 41:Mark 42:Luke 43:John 44:Acts 45:Rom 46:1Cor 47:2Cor 48:Gal 49:Eph 50:Phil 51:Col 52:1Thess 53:2Thess 54:1Tim 55:2Tim 56:Titus 57:Phlm 58:Heb 59:Jas 60:1Pet 61:2Pet 62:1John 63:2John 64:3John 65:Jude 66:Rev 67:Tob 68:Jdt 69:EsthGr 70:Wis 71:Sir 72:Bar 73:EpJer 74:PrAzar 75:Sus 76:Bel 77:1Macc 78:2Macc 79:3Macc 80:4Macc 81:PrMan 82:1Esd 83:2Esd 84:AddPs 85:Odes 86:PssSol 87:DanGr 88:EpLao"`,
    );
  });

  it("has unique OSIS IDs and USFM codes", () => {
    expect(new Set(BOOKS.map((b) => b.osis)).size).toBe(BOOKS.length);
    expect(new Set(BOOKS.map((b) => b.usfm)).size).toBe(BOOKS.length);
  });

  it("stays within the int4 ordinal limit", () => {
    expect(BOOKS.length).toBeLessThanOrEqual(MAX_BOOK_NUMBER);
  });

  it("looks books up by OSIS ID, USFM code (any case) and number", () => {
    expect(bookByUsfm("jhn")?.osis).toBe("John");
    expect(bookByNumber(19)?.usfm).toBe("PSA");
    expect(bookByOsis("john")).toBeUndefined();
  });
});
