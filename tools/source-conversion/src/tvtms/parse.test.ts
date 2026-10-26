import { formatOsisRef } from "@scripturetips/passage";
import { describe, expect, it } from "vitest";
import { parseTvtms, parseTvtmsRef } from "./parse.ts";

const ref = (text: string) => {
  const r = parseTvtmsRef(text);
  return typeof r === "string" ? r : formatOsisRef(r);
};

describe("TVTMS references", () => {
  it("reads book codes, Psalm titles and subverses", () => {
    expect(ref("Jol.2:28")).toBe("Joel.2.28");
    expect(ref("3Jn.1:14!a")).toBe("3John.1.14!a");
    expect(ref("Psa.3:Title")).toBe("Ps.3.0");
    expect(ref("Jos.9:2!3")).toBe("Josh.9.2!c");
    expect(ref("S3Y.1:1")).toBe("PrAzar.1.1");
    expect(ref("Esg.1:1")).toBe("EsthGr.1.1");
  });

  it("reports what our references can't hold", () => {
    expect(ref("Exo.37:2!j")).toBe("subverse beyond part 9");
    expect(ref("Exo.37:2!aa")).toBe("unparsable reference");
    expect(ref("Ade.1:1")).toBe("book not in the registry (Ade)");
  });
});

const file = (...rows: string[]) =>
  ["﻿header", "#DataStart(Expanded)", "SourceType\tSourceRef", ...rows, "#DataEnd(Expanded)"].join(
    "\n",
  );
const row = (type: string, source: string, standard: string, action: string, tests = "") =>
  [type, source, standard, action, "", "", "", "", tests].join("\t");

describe("TVTMS expanded rows", () => {
  it("splits the traditions and skips summaries and empty slots", () => {
    const { rows } = parseTvtms(
      file(
        row(
          "Hebrew+Greek",
          "Jol.3:1",
          "Jol.2:28",
          "Renumber verse",
          "Jol.3:1=Exist & Jol.3:5=Last",
        ),
        row("Greek", "3Jn.1:14-15", "3Jn.1:14", "Concatenation"),
        row("AllBibles", "Mat.17:21", "Mat.17:21", "IfEmpty verse"),
        row("Hebrew", "Neh.7:68", "Neh.7:68", "IfEmpty verse"),
      ),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.traditions).toEqual(["Hebrew", "Greek"]);
    expect(rows[0]?.alternative).toBe("Hebrew+Greek Jol.3 Jol.3:5=Last");
  });

  it("counts skipped rows by reason", () => {
    const { skipped } = parseTvtms(
      file(row("Greek", "Exo.37:2!j", "Exo.36:17", "Renumber verse*")),
    );
    expect(skipped.get("subverse beyond part 9")?.count).toBe(1);
  });
});
