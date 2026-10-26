/**
 * The golden set of hard cases (domain-model §2.1). Each expectation was checked against
 * TVTMS's rows for the passage.
 */

import {
  formatOsisPassage,
  formatOsisRef,
  parseOsisPassage,
  parseOsisRef,
} from "@scripturetips/passage";
import { describe, expect, it } from "vitest";
import { passageFromCanonical, passageToCanonical } from "./passage.ts";
import { fromCanonical, type SchemeId, toCanonical } from "./schemes.ts";

const to = (scheme: SchemeId, osis: string) => show(toCanonical(scheme, parseOsisRef(osis)));
const from = (scheme: SchemeId, osis: string) => show(fromCanonical(scheme, parseOsisRef(osis)));
const show = ({ refs, type }: ReturnType<typeof toCanonical>) => ({
  refs: refs.map(formatOsisRef),
  type,
});

describe("domain-model §2.1: verses moved between chapters", () => {
  it("English Joel 2:28–32 is Hebrew Joel 3:1–5, and English Joel 3 is Hebrew Joel 4", () => {
    expect(to("kjv", "Joel.2.28")).toEqual({ refs: ["Joel.3.1"], type: "renumbered" });
    expect(to("kjv", "Joel.2.32")).toEqual({ refs: ["Joel.3.5"], type: "renumbered" });
    expect(to("kjv", "Joel.3.21")).toEqual({ refs: ["Joel.4.21"], type: "renumbered" });
    expect(from("kjv", "Joel.4.1")).toEqual({ refs: ["Joel.3.1"], type: "renumbered" });
    expect(to("kjv", "Joel.2.27")).toEqual({ refs: ["Joel.2.27"], type: "same" });
  });

  it("English Malachi 4 is Hebrew Malachi 3:19–24", () => {
    expect(to("kjv", "Mal.4.1")).toEqual({ refs: ["Mal.3.19"], type: "renumbered" });
    expect(to("kjv", "Mal.4.6")).toEqual({ refs: ["Mal.3.24"], type: "renumbered" });
    expect(from("kjv", "Mal.3.24")).toEqual({ refs: ["Mal.4.6"], type: "renumbered" });
  });

  it("the Greek moves Malachi 4:4 to the end of the book", () => {
    expect(to("greek", "Mal.4.4")).toEqual({ refs: ["Mal.3.24"], type: "renumbered" });
    expect(to("greek", "Mal.4.5")).toEqual({ refs: ["Mal.3.22"], type: "renumbered" });
  });

  it("the Hebrew scheme is the canonical numbering of the Old Testament", () => {
    expect(to("hebrew", "Joel.4.1")).toEqual({ refs: ["Joel.4.1"], type: "same" });
    expect(to("hebrew", "Ps.51.2")).toEqual({ refs: ["Ps.51.2"], type: "same" });
  });
});

describe("domain-model §2.1: Psalm headings", () => {
  it("an English Psalm heading is verse 0, the Hebrew's verse 1", () => {
    expect(to("kjv", "Ps.3.0")).toEqual({ refs: ["Ps.3.1"], type: "renumbered" });
    expect(to("kjv", "Ps.3.1")).toEqual({ refs: ["Ps.3.2"], type: "renumbered" });
    expect(to("kjv", "Ps.3.8")).toEqual({ refs: ["Ps.3.9"], type: "renumbered" });
  });

  it("a heading of two Hebrew verses is one English heading", () => {
    expect(to("kjv", "Ps.51.0")).toEqual({ refs: ["Ps.51.1", "Ps.51.2"], type: "merged" });
    expect(from("kjv", "Ps.51.2")).toEqual({ refs: ["Ps.51.0"], type: "renumbered" });
    expect(to("kjv", "Ps.51.1")).toEqual({ refs: ["Ps.51.3"], type: "renumbered" });
  });

  it("the Latin and Greek count headings as the Hebrew does, a Psalm behind from Psalm 10", () => {
    expect(to("latin", "Ps.3.1")).toEqual({ refs: ["Ps.3.1"], type: "same" });
    expect(to("greek", "Ps.50.2")).toEqual({ refs: ["Ps.51.2"], type: "renumbered" });
    expect(from("latin", "Ps.51.1")).toEqual({ refs: ["Ps.50.1"], type: "renumbered" });
  });
});

describe("domain-model §2.1: verses split or merged", () => {
  it("English 3 John 14 is Greek 3 John 14–15", () => {
    expect(to("kjv", "3John.1.14")).toEqual({
      refs: ["3John.1.14", "3John.1.15"],
      type: "merged",
    });
    expect(to("kjv", "3John.1.14!b")).toEqual({ refs: ["3John.1.15"], type: "partial" });
    expect(from("kjv", "3John.1.15")).toEqual({ refs: ["3John.1.14!b"], type: "partial" });
  });

  it("Greek Revelation 12:18 is the first part of English 13:1", () => {
    expect(from("kjv", "Rev.12.18")).toEqual({ refs: ["Rev.13.1!a"], type: "partial" });
    expect(to("kjv", "Rev.13.1")).toEqual({ refs: ["Rev.12.18", "Rev.13.1"], type: "merged" });
    expect(to("kjv", "Rev.12.17")).toEqual({ refs: ["Rev.12.17"], type: "same" });
  });
});

describe("domain-model §2.1: verses omitted", () => {
  it("Matthew 17:21 keeps its canonical slot", () => {
    expect(to("kjv", "Matt.17.21")).toEqual({ refs: ["Matt.17.21"], type: "same" });
    expect(to("greek", "Matt.17.21")).toEqual({ refs: ["Matt.17.21"], type: "same" });
  });

  it("the Latin numbers Matthew 17 differently from verse 20", () => {
    expect(to("latin", "Matt.17.20")).toEqual({ refs: ["Matt.17.21"], type: "renumbered" });
  });

  it("the Hebrew has no Nehemiah 7:68 of the English", () => {
    expect(to("kjv", "Neh.7.68")).toEqual({ refs: [], type: "added" });
    expect(to("kjv", "Neh.7.69")).toEqual({ refs: ["Neh.7.68"], type: "renumbered" });
  });

  it("a canonical verse whose number the scheme gives to another verse is omitted", () => {
    expect(from("kjv", "Joel.2.28")).toEqual({ refs: [], type: "omitted" });
  });
});

describe("domain-model §2.1: books present in only some canons", () => {
  it("the Greek additions to Daniel and Psalm 151 keep their own books", () => {
    expect(to("greek", "Dan.3.24")).toEqual({ refs: ["PrAzar.1.1"], type: "renumbered" });
    expect(to("greek", "Ps.151.1")).toEqual({ refs: ["AddPs.1.1"], type: "renumbered" });
    expect(to("latin", "Dan.13.1")).toEqual({ refs: ["Sus.1.1"], type: "renumbered" });
  });

  it("the Hebrew scheme numbers only the Old Testament", () => {
    expect(() => toCanonical("hebrew", parseOsisRef("Matt.1.1"))).toThrow(/doesn't number/);
  });
});

describe("passages", () => {
  it("converts both ends of a range", () => {
    const joel = passageToCanonical("kjv", parseOsisPassage("Joel.2.28-Joel.3.1"));
    expect(joel && formatOsisPassage(joel)).toBe("Joel.3.1-Joel.4.1");
    const back = passageFromCanonical("kjv", parseOsisPassage("Rev.12.17-Rev.12.18"));
    expect(back && formatOsisPassage(back)).toBe("Rev.12.17-Rev.13.1!a");
  });

  it("gives no passage when it would cross books", () => {
    expect(passageToCanonical("greek", parseOsisPassage("Dan.3.23-Dan.3.24"))).toBeUndefined();
  });
});
