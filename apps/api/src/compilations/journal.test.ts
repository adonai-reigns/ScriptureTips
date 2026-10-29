import { describe, expect, it } from "vitest";
import {
  applyDelta,
  eventHash,
  type JournalHeader,
  journalHash,
  type RecordedEvent,
  verifyJournal,
} from "./journal.ts";
import { isTakenFrom, similarity } from "./similarity.ts";

const header: JournalHeader = {
  id: "j1",
  authorId: "u1",
  compilationId: "c1",
  entered: "Gen.1.1",
  startText: "",
  startedAt: new Date("2026-10-29T00:00:00Z"),
};

/** Records `deltas` as a chain from `header`. */
function record(deltas: [number, string, string][]): { events: RecordedEvent[]; text: string } {
  let prev = journalHash(header);
  let text = header.startText;
  const events = deltas.map(([position, removed, inserted], k) => {
    const e = {
      seq: k + 1,
      at: new Date(header.startedAt.getTime() + k * 1000),
      elapsed: k * 1000,
      kind: "replace" as const,
      position,
      removed,
      inserted,
      pasteOrigin: null,
      pasteTranslationId: null,
      prevHash: prev,
    };
    prev = eventHash(e);
    text = applyDelta(text, e) ?? "";
    return { ...e, hash: prev };
  });
  return { events, text };
}

describe("domain-model §2.3.1: the authorship journal", () => {
  it("applies a change only where it fits the text", () => {
    expect(
      applyDelta("In the start", { position: 7, removed: "start", inserted: "beginning" }),
    ).toBe("In the beginning");
    expect(applyDelta("In the start", { position: 7, removed: "end", inserted: "x" })).toBeNull();
    expect(applyDelta("abc", { position: 4, removed: "", inserted: "x" })).toBeNull();
  });

  it("verifies an unchanged chain that replays to its text", () => {
    const { events, text } = record([
      [0, "", "In the start"],
      [7, "start", "beginning"],
      [16, "", " God created."],
    ]);
    expect(text).toBe("In the beginning God created.");
    const head = events.at(-1)?.hash ?? "";
    expect(verifyJournal({ ...header, text, headHash: head }, events)).toBe(true);
  });

  it("shows any event changed, dropped or reordered, or a text that doesn't match", () => {
    const { events, text } = record([
      [0, "", "In the start"],
      [7, "start", "beginning"],
    ]);
    const head = events.at(-1)?.hash ?? "";
    const ok = { ...header, text, headHash: head };
    const [first, second] = events as [RecordedEvent, RecordedEvent];
    expect(verifyJournal(ok, [{ ...first, inserted: "In the begin" }, second])).toBe(false);
    expect(verifyJournal(ok, [second])).toBe(false);
    expect(verifyJournal(ok, [second, first])).toBe(false);
    expect(verifyJournal({ ...ok, text: "Something else" }, events)).toBe(false);
    expect(verifyJournal({ ...ok, startedAt: new Date() }, events)).toBe(false);
  });
});

describe("domain-model §2.3.1: similarity", () => {
  it("scores the words two wordings share, in order, ignoring case and punctuation", () => {
    expect(similarity("In the beginning, God created.", "in the beginning God created")).toEqual({
      score: 100,
      matched: ["In the beginning God created"],
    });
    expect(similarity("At first God made", "In the beginning God created")).toMatchObject({
      score: 22,
      matched: [],
    });
    expect(
      similarity("And God said let light be", "And God said, Let there be light").matched,
    ).toEqual(["And God said let"]);
  });

  it("tells text pasted from a translation", () => {
    expect(
      isTakenFrom("the heaven and", "In the beginning God created the heaven and the earth."),
    ).toBe(true);
    expect(
      isTakenFrom("the earth heaven", "In the beginning God created the heaven and the earth."),
    ).toBe(false);
    // A word or two isn't a passage taken from it, unless that's the whole verse.
    expect(isTakenFrom("the earth", "In the beginning God created the heaven and the earth.")).toBe(
      false,
    );
    expect(isTakenFrom("Jesus wept", "Jesus wept.")).toBe(true);
  });
});
