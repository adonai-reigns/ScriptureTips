/**
 * The translations to import, from the files in source-texts (sources.md §3). Each names its
 * license by key only: what the license allows is the license module's business
 * (domain-model §7), never assumed here.
 */

import type { SchemeId } from "@scripturetips/versification";

export type LicenseKey = "public-domain" | "cc0-1.0" | "cc-by-sa-4.0" | "net-bible" | "leb";

export interface CatalogEntry {
  /** Unique, stable: the eBible ID where there is one. */
  readonly id: string;
  readonly abbreviation: string;
  readonly name: string;
  readonly language: string;
  readonly direction: "ltr" | "rtl";
  readonly scheme: SchemeId;
  readonly license: LicenseKey;
  /**
   * A USFM zip archive or a folder of USFM files, under source-texts. Its first folder is
   * also the translation's license-evidence folder (docs/license-evidence/).
   */
  readonly source: string;
  /** Not imported yet, and why: a decision still open in sources.md §8. */
  readonly held?: string;
}

const english = (
  id: string,
  abbreviation: string,
  name: string,
  source: string,
  license: LicenseKey,
  { scheme = "kjv", held }: { scheme?: SchemeId; held?: string } = {},
): CatalogEntry => ({
  id,
  abbreviation,
  name,
  language: "en",
  direction: "ltr",
  scheme,
  license,
  source,
  ...(held ? { held } : {}),
});

export const CATALOG: readonly CatalogEntry[] = [
  english(
    "eng-asv",
    "ASV",
    "American Standard Version (1901)",
    "american-standard-version/eng-asv_usfm.zip",
    "public-domain",
  ),
  english(
    "eng-kjv",
    "KJV",
    "King James Version (1769), with the Apocrypha",
    "king-james-version/eng-kjv_usfm.zip",
    "public-domain",
  ),
  english(
    "eng-kjv2006",
    "KJV2006",
    "King James Version with Strong's numbers",
    "king-james-version/eng-kjv2006_usfm.zip",
    "public-domain",
  ),
  english(
    "engkjvcpb",
    "KJVCPB",
    "King James Version, Cambridge Paragraph Bible",
    "king-james-version/engkjvcpb_usfm.zip",
    "public-domain",
  ),
  english(
    "engylt",
    "YLT",
    "Young's Literal Translation (1898)",
    "youngs-literal-translation/engylt_usfm.zip",
    "public-domain",
  ),
  english(
    "engDBY",
    "DBY",
    "Darby Translation (1884)",
    "darby-translation/engDBY_usfm.zip",
    "public-domain",
    { held: "a \\ft inside \\+w in its notes, which the parser rejects (sources.md §8)" },
  ),
  english(
    "eng-web",
    "WEB",
    "World English Bible (Classic)",
    "world-english-bible/eng-web_usfm.zip",
    "public-domain",
  ),
  english(
    "engwebu",
    "WEBU",
    "World English Bible (Updated)",
    "world-english-bible/engwebu_usfm.zip",
    "public-domain",
  ),
  english(
    "engwebp",
    "WEBP",
    "World English Bible",
    "world-english-bible/engwebp_usfm.zip",
    "public-domain",
  ),
  english(
    "bsb",
    "BSB",
    "Berean Standard Bible",
    "berean-standard-bible/bsb_usfm.zip",
    "public-domain",
  ),
  english(
    "engmsb",
    "MSB",
    "Majority Standard Bible",
    "majority-standard-bible/engmsb_usfm.zip",
    "public-domain",
  ),
  english(
    "engDRA",
    "DRA",
    "Douay-Rheims (1899 American edition)",
    "douay-rheims-1899/engDRA_usfm.zip",
    "public-domain",
    { scheme: "latin" },
  ),
  english(
    "enggnv",
    "GNV",
    "Geneva Bible (1599)",
    "geneva-bible-1599/enggnv_usfm.zip",
    "public-domain",
  ),
  english(
    "jps1917",
    "JPS",
    "The Holy Scriptures according to the Masoretic Text (JPS 1917)",
    "jps-tanakh-1917/converted",
    "public-domain",
    { scheme: "hebrew" },
  ),
  english(
    "engwebster",
    "WBT",
    "Webster Bible (1833)",
    "webster-bible-1833/engwebster_usfm.zip",
    "public-domain",
  ),
  english(
    "engtnt",
    "TNT",
    "Tyndale New Testament (1534)",
    "tyndale-new-testament/engtnt_usfm.zip",
    "public-domain",
  ),
  english(
    "eng-rv",
    "RV",
    "Revised Version (1895), with the Apocrypha",
    "revised-version-1895/eng-rv_usfm.zip",
    "public-domain",
  ),
  english(
    "engWycliffe",
    "WYC",
    "Wycliffe Bible (Pentateuch and Gospels)",
    "wycliffe-bible/engWycliffe_usfm.zip",
    "public-domain",
  ),
  english(
    "engoebus",
    "OEB",
    "Open English Bible (US spelling)",
    "open-english-bible/engoebus_usfm.zip",
    "cc0-1.0",
  ),
  english(
    "engoebcw",
    "OEBCW",
    "Open English Bible (Commonwealth spelling)",
    "open-english-bible/engoebcw_usfm.zip",
    "cc0-1.0",
  ),
  english(
    "englsv",
    "LSV",
    "Literal Standard Version",
    "literal-standard-version/englsv_usfm.zip",
    "cc-by-sa-4.0",
    { held: "its poetry separator || reads as an attribute bar (sources.md §8)" },
  ),
  english(
    "engfbv",
    "FBV",
    "Free Bible Version",
    "free-bible-version/engfbv_usfm.zip",
    "cc-by-sa-4.0",
    { held: "\\xt left open in its notes, which the parser rejects (sources.md §8)" },
  ),
  english(
    "en_ult",
    "ULT",
    "unfoldingWord Literal Text (v91)",
    "unfoldingword-literal-text/en_ult-v91.zip",
    "cc-by-sa-4.0",
    { held: "word alignment to the Hebrew and Greek: how to keep it is undecided (sources.md §8)" },
  ),
  english(
    "en_ust",
    "UST",
    "unfoldingWord Simplified Text (v91)",
    "unfoldingword-simplified-text/en_ust-v91.zip",
    "cc-by-sa-4.0",
    { held: "as en_ult" },
  ),
  english(
    "engnet",
    "NET",
    "NET Bible (text without notes)",
    "net-bible/engnet_usfm.zip",
    "net-bible",
  ),
  english("leb", "LEB", "Lexham English Bible", "lexham-english-bible/converted", "leb"),
];

/** Files held but not imported, and why. */
export const NOT_IMPORTED: Readonly<Record<string, string>> = {
  "berean-standard-bible/engbsb_usfm.zip": "eBible's copy; the official BSB file is imported",
  "jps-tanakh-1917/engjps_usfm.zip":
    "renumbered to the KJV; the 1917 printing's own numbering is imported (jps1917)",
  "brenton-septuagint/eng-Brenton_usfm.zip":
    "prints Psalm headings unnumbered, which no scheme follows yet (sources.md §8)",
  "brenton-septuagint/eng-lxx2012_usfm.zip": "as eng-Brenton",
  "brenton-septuagint/englxxup_usfm.zip": "as eng-Brenton",
  "open-english-bible/Open-English-Bible-1965127de5c3.zip": "the eBible builds are imported",
};
