/** The 39 books in the order of the 1917 printing (Law, Prophets, Writings). */
export interface BookInfo {
  /** The book's heading as it appears in the transcription. */
  readonly heading: string;
  /** USFM book code. */
  readonly code: string;
  /** Display name for the USFM header. */
  readonly name: string;
  /** The Hebrew title printed above the English one (unpointed, as printed). */
  readonly hebrew: string;
  /** Verses per chapter in the printing (Hebrew numbering). */
  readonly chapters: readonly number[];
}

/**
 * Verses per chapter follow the Hebrew (Masoretic) numbering, which the 1917 printing uses.
 * The counts were checked against Sefaria's chapter lengths for the Hebrew text
 * (https://www.sefaria.org/api/shape/{book}, 2026-10-26). Where the printing differs, the
 * printing wins and the difference is noted beside the book.
 */
export const BOOKS: readonly BookInfo[] = [
  {
    heading: "GENESIS",
    code: "GEN",
    name: "Genesis",
    hebrew: "בראשית",
    chapters: [
      31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38, 18, 34, 24, 20,
      67, 34, 35, 46, 22, 35, 43, 54, 33, 20, 31, 29, 43, 36, 30, 23, 23, 57, 38, 34, 34, 28, 34,
      31, 22, 33, 26,
    ],
  },
  {
    heading: "EXODUS",
    code: "EXO",
    name: "Exodus",
    hebrew: "שמות",
    chapters: [
      22, 25, 22, 31, 23, 30, 29, 28, 35, 29, 10, 51, 22, 31, 27, 36, 16, 27, 25, 23, 37, 30, 33,
      18, 40, 37, 21, 43, 46, 38, 18, 35, 23, 35, 35, 38, 29, 31, 43, 38,
    ],
  },
  {
    heading: "LEVITICUS",
    code: "LEV",
    name: "Leviticus",
    hebrew: "ויקרא",
    chapters: [
      17, 16, 17, 35, 26, 23, 38, 36, 24, 20, 47, 8, 59, 57, 33, 34, 16, 30, 37, 27, 24, 33, 44, 23,
      55, 46, 34,
    ],
  },
  {
    heading: "NUMBERS",
    code: "NUM",
    name: "Numbers",
    hebrew: "במדבר",
    // 25:19 is a verse of its own in the printing.
    chapters: [
      54, 34, 51, 49, 31, 27, 89, 26, 23, 36, 35, 16, 33, 45, 41, 35, 28, 32, 22, 29, 35, 41, 30,
      25, 19, 65, 23, 31, 39, 17, 54, 42, 56, 29, 34, 13,
    ],
  },
  {
    heading: "DEUTERONOMY",
    code: "DEU",
    name: "Deuteronomy",
    hebrew: "דברים",
    chapters: [
      46, 37, 29, 49, 30, 25, 26, 20, 29, 22, 32, 31, 19, 29, 23, 22, 20, 22, 21, 20, 23, 29, 26,
      22, 19, 19, 26, 69, 28, 20, 30, 52, 29, 12,
    ],
  },
  {
    heading: "JOSHUA",
    code: "JOS",
    name: "Joshua",
    hebrew: "יהושע",
    chapters: [
      18, 24, 17, 24, 15, 27, 26, 35, 27, 43, 23, 24, 33, 15, 63, 10, 18, 28, 51, 9, 45, 34, 16, 33,
    ],
  },
  {
    heading: "JUDGES",
    code: "JDG",
    name: "Judges",
    hebrew: "שפטים",
    chapters: [36, 23, 31, 24, 31, 40, 25, 35, 57, 18, 40, 15, 25, 20, 20, 31, 13, 31, 30, 48, 25],
  },
  {
    heading: "FIRST SAMUEL",
    code: "1SA",
    name: "First Samuel",
    hebrew: "שמואל א",
    chapters: [
      28, 36, 21, 22, 12, 21, 17, 22, 27, 27, 15, 25, 23, 52, 35, 23, 58, 30, 24, 42, 16, 23, 28,
      23, 44, 25, 12, 25, 11, 31, 13,
    ],
  },
  {
    heading: "SECOND SAMUEL",
    code: "2SA",
    name: "Second Samuel",
    hebrew: "שמואל ב",
    chapters: [
      27, 32, 39, 12, 25, 23, 29, 18, 13, 19, 27, 31, 39, 33, 37, 23, 29, 32, 44, 26, 22, 51, 39,
      25,
    ],
  },
  {
    heading: "FIRST KINGS",
    code: "1KI",
    name: "First Kings",
    hebrew: "מלכים א",
    chapters: [
      53, 46, 28, 20, 32, 38, 51, 66, 28, 29, 43, 33, 34, 31, 34, 34, 24, 46, 21, 43, 29, 54,
    ],
  },
  {
    heading: "SECOND KINGS",
    code: "2KI",
    name: "Second Kings",
    hebrew: "מלכים ב",
    chapters: [
      18, 25, 27, 44, 27, 33, 20, 29, 37, 36, 20, 22, 25, 29, 38, 20, 41, 37, 37, 21, 26, 20, 37,
      20, 30,
    ],
  },
  {
    heading: "ISAIAH",
    code: "ISA",
    name: "Isaiah",
    hebrew: "ישעיה",
    chapters: [
      31, 22, 26, 6, 30, 13, 25, 23, 20, 34, 16, 6, 22, 32, 9, 14, 14, 7, 25, 6, 17, 25, 18, 23, 12,
      21, 13, 29, 24, 33, 9, 20, 24, 17, 10, 22, 38, 22, 8, 31, 29, 25, 28, 28, 25, 13, 15, 22, 26,
      11, 23, 15, 12, 17, 13, 12, 21, 14, 21, 22, 11, 12, 19, 11, 25, 24,
    ],
  },
  {
    heading: "JEREMIAH",
    code: "JER",
    name: "Jeremiah",
    hebrew: "ירמיה",
    chapters: [
      19, 37, 25, 31, 31, 30, 34, 23, 25, 25, 23, 17, 27, 22, 21, 21, 27, 23, 15, 18, 14, 30, 40,
      10, 38, 24, 22, 17, 32, 24, 40, 44, 26, 22, 19, 32, 21, 28, 18, 16, 18, 22, 13, 30, 5, 28, 7,
      47, 39, 46, 64, 34,
    ],
  },
  {
    heading: "EZEKIEL",
    code: "EZK",
    name: "Ezekiel",
    hebrew: "יחזקאל",
    chapters: [
      28, 10, 27, 17, 17, 14, 27, 18, 11, 22, 25, 28, 23, 23, 8, 63, 24, 32, 14, 44, 37, 31, 49, 27,
      17, 21, 36, 26, 21, 26, 18, 32, 33, 31, 15, 38, 28, 23, 29, 49, 26, 20, 27, 31, 25, 24, 23,
      35,
    ],
  },
  {
    heading: "HOSEA",
    code: "HOS",
    name: "Hosea",
    hebrew: "הושע",
    chapters: [9, 25, 5, 19, 15, 11, 16, 14, 17, 15, 11, 15, 15, 10],
  },
  { heading: "JOEL", code: "JOL", name: "Joel", hebrew: "יואל", chapters: [20, 27, 5, 21] },
  {
    heading: "AMOS",
    code: "AMO",
    name: "Amos",
    hebrew: "עמוס",
    chapters: [15, 16, 15, 13, 27, 14, 17, 14, 15],
  },
  { heading: "OBADIAH", code: "OBA", name: "Obadiah", hebrew: "עבדיה", chapters: [21] },
  { heading: "JONAH", code: "JON", name: "Jonah", hebrew: "יונה", chapters: [16, 11, 10, 11] },
  {
    heading: "MICAH",
    code: "MIC",
    name: "Micah",
    hebrew: "מיכה",
    chapters: [16, 13, 12, 14, 14, 16, 20],
  },
  { heading: "NAHUM", code: "NAM", name: "Nahum", hebrew: "נחום", chapters: [14, 14, 19] },
  { heading: "HABAKKUK", code: "HAB", name: "Habakkuk", hebrew: "חבקוק", chapters: [17, 20, 19] },
  { heading: "ZEPHANIAH", code: "ZEP", name: "Zephaniah", hebrew: "צפניה", chapters: [18, 15, 20] },
  { heading: "HAGGAI", code: "HAG", name: "Haggai", hebrew: "חגי", chapters: [15, 23] },
  {
    heading: "ZECHARIAH",
    code: "ZEC",
    name: "Zechariah",
    hebrew: "זכריה",
    chapters: [17, 17, 10, 14, 11, 15, 14, 23, 17, 12, 17, 14, 9, 21],
  },
  { heading: "MALACHI", code: "MAL", name: "Malachi", hebrew: "מלאכי", chapters: [14, 17, 24] },
  {
    heading: "PSALMS",
    code: "PSA",
    name: "Psalms",
    hebrew: "תהלים",
    chapters: [
      6, 12, 9, 9, 13, 11, 18, 10, 21, 18, 7, 9, 6, 7, 5, 11, 15, 51, 15, 10, 14, 32, 6, 10, 22, 12,
      14, 9, 11, 13, 25, 11, 22, 23, 28, 13, 40, 23, 14, 18, 14, 12, 5, 27, 18, 12, 10, 15, 21, 23,
      21, 11, 7, 9, 24, 14, 12, 12, 18, 14, 9, 13, 12, 11, 14, 20, 8, 36, 37, 6, 24, 20, 28, 23, 11,
      13, 21, 72, 13, 20, 17, 8, 19, 13, 14, 17, 7, 19, 53, 17, 16, 16, 5, 23, 11, 13, 12, 9, 9, 5,
      8, 29, 22, 35, 45, 48, 43, 14, 31, 7, 10, 10, 9, 8, 18, 19, 2, 29, 176, 7, 8, 9, 4, 8, 5, 6,
      5, 6, 8, 8, 3, 18, 3, 3, 21, 26, 9, 8, 24, 14, 10, 8, 12, 15, 21, 10, 20, 14, 9, 6,
    ],
  },
  {
    heading: "PROVERBS",
    code: "PRO",
    name: "Proverbs",
    hebrew: "משלי",
    chapters: [
      33, 22, 35, 27, 23, 35, 27, 36, 18, 32, 31, 28, 25, 35, 33, 33, 28, 24, 29, 30, 31, 29, 35,
      34, 28, 28, 27, 28, 27, 33, 31,
    ],
  },
  {
    heading: "JOB",
    code: "JOB",
    name: "Job",
    hebrew: "איוב",
    chapters: [
      22, 13, 26, 21, 27, 30, 21, 22, 35, 22, 20, 25, 28, 22, 35, 22, 16, 21, 29, 29, 34, 30, 17,
      25, 6, 14, 23, 28, 25, 31, 40, 22, 33, 37, 16, 33, 24, 41, 30, 32, 26, 17,
    ],
  },
  {
    heading: "SONG OF SONGS",
    code: "SNG",
    name: "Song of Songs",
    hebrew: "שיר השירים",
    chapters: [17, 17, 11, 16, 16, 12, 14, 14],
  },
  { heading: "RUTH", code: "RUT", name: "Ruth", hebrew: "רות", chapters: [22, 23, 18, 22] },
  {
    heading: "LAMENTATIONS",
    code: "LAM",
    name: "Lamentations",
    hebrew: "איכה",
    chapters: [22, 22, 66, 22, 22],
  },
  {
    heading: "ECCLESIASTES",
    code: "ECC",
    name: "Ecclesiastes",
    hebrew: "קהלת",
    chapters: [18, 26, 22, 17, 19, 12, 29, 17, 18, 20, 10, 14],
  },
  {
    heading: "ESTHER",
    code: "EST",
    name: "Esther",
    hebrew: "אסתר",
    chapters: [22, 23, 15, 17, 14, 14, 10, 17, 32, 3],
  },
  {
    heading: "DANIEL",
    code: "DAN",
    name: "Daniel",
    hebrew: "דניאל",
    chapters: [21, 49, 33, 34, 30, 29, 28, 27, 27, 21, 45, 13],
  },
  {
    heading: "EZRA",
    code: "EZR",
    name: "Ezra",
    hebrew: "עזרא",
    chapters: [11, 70, 13, 24, 17, 22, 28, 36, 15, 44],
  },
  {
    heading: "NEHEMIAH",
    code: "NEH",
    name: "Nehemiah",
    hebrew: "נחמיה",
    // 7:68, which authoritative codices place in the margin, is printed as a verse (scan page 1070).
    chapters: [11, 20, 38, 17, 19, 19, 73, 18, 37, 40, 36, 47, 31],
  },
  {
    heading: "FIRST CHRONICLES",
    code: "1CH",
    name: "First Chronicles",
    hebrew: "דברי הימים א",
    chapters: [
      54, 55, 24, 43, 41, 66, 40, 40, 44, 14, 47, 41, 14, 17, 29, 43, 27, 17, 19, 8, 30, 19, 32, 31,
      31, 32, 34, 21, 30,
    ],
  },
  {
    heading: "SECOND CHRONICLES",
    code: "2CH",
    name: "Second Chronicles",
    hebrew: "דברי הימים ב",
    chapters: [
      18, 17, 17, 22, 14, 42, 22, 18, 31, 19, 23, 16, 23, 14, 19, 14, 19, 34, 11, 37, 20, 12, 21,
      27, 28, 23, 9, 27, 36, 27, 21, 33, 25, 33, 27, 23,
    ],
  },
];

/** Section titles of the printing. Each starts a contents list that ends the previous book. */
export const SECTION_TITLES: readonly string[] = ["THE LAW", "THE PROPHETS", "THE WRITINGS"];
