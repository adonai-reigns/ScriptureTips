import { BOOKS, formatOsisRef } from "@scripturetips/passage";
import { describe, expect, it } from "vitest";
import { canonicalTradition, compose } from "./compose.ts";
import { parseTvtms } from "./parse.ts";

const ALL = new Set(BOOKS.map((b) => b.osis));
const row = (type: string, source: string, standard: string, tests = "") =>
  [type, source, standard, "Renumber verse", "", "", "", "", tests].join("\t");
const pairsOf = (tradition: string, ...rows: string[]) => {
  const text = ["#DataStart(Expanded)", ...rows, "#DataEnd(Expanded)"].join("\n");
  return compose(parseTvtms(text).rows, tradition, ALL).pairs.map(([s, c]) =>
    [s, c].map((r) => (r ? formatOsisRef(r) : "null")).join(" = "),
  );
};

describe("composing a scheme with the canonical scheme through the KJV standard", () => {
  it("uses the Hebrew for the Old Testament and the Greek elsewhere", () => {
    expect(canonicalTradition("Joel")).toBe("Hebrew");
    expect(canonicalTradition("Sir")).toBe("Greek");
    expect(canonicalTradition("Rev")).toBe("Greek");
  });

  it("maps a KJV verse to the Hebrew verse with the same standard", () => {
    expect(
      pairsOf("Eng-KJV", row("Hebrew", "Jol.3:1", "Jol.2:28"), row("Hebrew", "Jol.4:1", "Jol.3:1")),
    ).toEqual(["Joel.2.28 = Joel.3.1", "Joel.3.1 = Joel.4.1"]);
  });

  it("pairs a merged verse with the canonical parts of it", () => {
    expect(
      pairsOf(
        "Eng-KJV",
        row("Eng-KJV", "3Jn.1:14", "3Jn.1:14"),
        row("Greek", "3Jn.1:14", "3Jn.1:14!a"),
        row("Greek", "3Jn.1:15", "3Jn.1:14!b"),
      ),
    ).toEqual(["3John.1.14!a = 3John.1.14", "3John.1.14!b = 3John.1.15"]);
  });

  it("pairs a two-verse heading with the other tradition's, verse by verse", () => {
    expect(
      pairsOf(
        "Latin",
        row("Hebrew", "Psa.51:1", "Psa.51:Title"),
        row("Hebrew", "Psa.51:2", "Psa.51:Title"),
        row("Latin", "Psa.50:1", "Psa.51:Title"),
        row("Latin", "Psa.50:2", "Psa.51:Title"),
      ),
    ).toEqual(["Ps.50.1 = Ps.51.1", "Ps.50.2 = Ps.51.2"]);
  });

  it("ignores the Greek's place for an addition in a Hebrew book", () => {
    expect(pairsOf("Greek", row("Greek", "Dan.3:24", "S3Y.1:1"))).toEqual([
      "Dan.3.24 = PrAzar.1.1",
    ]);
  });

  it("marks a verse whose number belongs to another verse as without counterpart", () => {
    const pairs = pairsOf(
      "Eng-KJV",
      row("Eng-KJV", "Neh.7:68", "Neh.7:68"),
      row("Eng-KJV", "Neh.7:69", "Neh.7:69"),
      row("Hebrew", "Neh.7:68", "Neh.7:69"),
    );
    expect(pairs).toEqual(["Neh.7.68 = null", "Neh.7.69 = Neh.7.68"]);
  });

  it("keeps the first alternative of a tradition whole", () => {
    const pairs = pairsOf(
      "Eng-KJV",
      row("Greek", "Sir.20:17", "Sir.20:17", "Sir.20:17=Exist & Sir.20:32=Last"),
      row("Greek", "Sir.20:18", "Sir.20:19", "Sir.20:18=Exist & Sir.20:32=Last"),
      row("Greek+NRSV", "Sir.20:17", "Sir.20:18", "Sir.20:17=Exist & Sir.20:31=Last"),
      row("Greek+NRSV", "Sir.20:30", "Sir.20:31", "Sir.20:30=Exist & Sir.20:31=Last"),
    );
    // The second alternative's Sir 20:30 → 20:31 is dropped with the rest of it.
    expect(pairs).toEqual(["Sir.20.19 = Sir.20.18"]);
  });
});
