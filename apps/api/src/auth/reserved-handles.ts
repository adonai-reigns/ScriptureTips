// cspell:disable -- handles written run together, as they are matched
/**
 * Handles no one can take (domain-model §1.6). Kept in code for now; the lists move to the
 * database later, so staff can maintain them without a release.
 */

import { generalReservedNames } from "./reserved-names.generated.ts";

/**
 * The site's own paths, and service and system names from published lists: matched exactly,
 * so ordinary handles that merely start with one (`blog-of-ruth`, `test-of-faith`) stay available.
 */
const EXACT = new Set([
  ...generalReservedNames,
  "about",
  "account",
  "api",
  "auth",
  "credits",
  "help",
  "l",
  "n",
  "notes",
  "p",
  "privacy",
  "read",
  "settings",
  "sign-in",
  "sign-out",
  "terms",
]);

/** Names that would let an account appear to speak for ScriptureTips. */
const STAFF = [
  "admin",
  "administrator",
  "moderator",
  "official",
  "root",
  "scripturetips",
  "staff",
  "support",
  "system",
];

/**
 * The names and titles of God, everyday words among them (domain-model §1.6), drawn from the
 * names of God in Judaism and in Christianity, the names and titles of Jesus in the New
 * Testament, and the titles of the Holy Spirit. Transliterations without diacritics or
 * apostrophes, in their common spellings.
 */
const GOD = [
  // The Name, and its spellings
  "yhwh",
  "yhvh",
  "jhwh",
  "jhvh",
  "tetragrammaton",
  "yahweh",
  "yahveh",
  "yahuah",
  "yahuwah",
  "yehovah",
  "jehovah",
  "jah",
  "yah",
  "yahu",
  "hashem",
  // Names and titles of God
  "god",
  "lord",
  "lordgod",
  "godalmighty",
  "almighty",
  "father",
  "heavenlyfather",
  "ourfather",
  "abba",
  "pater",
  "adonai",
  "adonoi",
  "eloah",
  "elohim",
  "elohei",
  "aleim",
  "elah",
  "elahyisrael",
  "elshaddai",
  "shaddai",
  "elyon",
  "elelyon",
  "elroi",
  "elolam",
  "elhagibbor",
  "mosthigh",
  "godmosthigh",
  "tzevaot",
  "tzevaoth",
  "tsebaoth",
  "sabaoth",
  "lordofhosts",
  "lordsabaoth",
  "ehyeh",
  "ehyehasherehyeh",
  "iam",
  "iamthatiam",
  "iamwhoiam",
  "anishani",
  "eternal",
  "eternalone",
  "ancientofdays",
  "creator",
  "maker",
  "theos",
  "kyrios",
  "pantokrator",
  "pantocrator",
  "trinity",
  "holytrinity",
  "holyone",
  "holyoneofisrael",
  "haqqadosh",
  "hakadosh",
  "hakadoshbarukhhu",
  "kudshabrikhhu",
  "kadoshyisrael",
  "shekhinah",
  "shekinah",
  "shechinah",
  "shalom",
  "osehshalom",
  "emet",
  "makom",
  "hamakom",
  "einsof",
  "abir",
  "adir",
  "adonolam",
  "avharachamim",
  "avinumalkeinu",
  "bore",
  "boreolam",
  "eibishter",
  "aybishter",
  "melechhaolam",
  "melechhamelachim",
  "memra",
  "ribonoshelolam",
  "harachaman",
  "rachmana",
  "roehyisrael",
  "rofehcholim",
  "shomeryisrael",
  "tzuryisrael",
  "magenavraham",
  "baal",
  "igziabeher",
  "jealous",
  "fatherofmercies",
  "fatheroflights",
  "rock",
  "rockofages",
  "rockofisrael",
  "judge",
  "kingofglory",
  // The compound names (YHWH-Yireh …)
  "yhwhyireh",
  "adonaijireh",
  "jehovahjireh",
  "yhwhrapha",
  "jehovahrapha",
  "jehovahrophe",
  "yhwhnissi",
  "adonainissi",
  "jehovahnissi",
  "yhwhroi",
  "jehovahrohi",
  "yhwhtsidkenu",
  "jehovahtsidkenu",
  "yhwhshammah",
  "adonaishammah",
  "jehovahshammah",
  "yhwhshalom",
  "adonaishalom",
  "jehovahshalom",
  "yhwhtzevaot",
  "adonaitzevaot",
  "jehovahsabaoth",
  // Jesus
  "jesus",
  "jesuschrist",
  "christjesus",
  "lordjesus",
  "lordjesuschrist",
  "christ",
  "yeshua",
  "yehoshua",
  "yeshuahamashiach",
  "iesous",
  "iesus",
  "christos",
  "messiah",
  "mashiach",
  "mashiah",
  "meshiha",
  "mshiha",
  "emmanuel",
  "immanuel",
  "logos",
  "word",
  "wordofgod",
  "sonofgod",
  "sonofman",
  "barnasha",
  "sonofdavid",
  "sonofjoseph",
  "sonofmary",
  "sonofthemosthigh",
  "lambofgod",
  "agnusdei",
  "newadam",
  "secondadam",
  "lastadam",
  "light",
  "lightoftheworld",
  "kingofthejews",
  "kingofisrael",
  "kingofkings",
  "lordoflords",
  "king",
  "master",
  "epistates",
  "rabbi",
  "rabboni",
  "teacher",
  "jesusofnazareth",
  "jesusthenazarene",
  "nazarene",
  "savior",
  "saviour",
  "savioroftheworld",
  "saviouroftheworld",
  "redeemer",
  "deliverer",
  "chosenone",
  "electone",
  "holyoneofgod",
  "breadoflife",
  "goodshepherd",
  "shepherd",
  "way",
  "truth",
  "life",
  "resurrection",
  "resurrectionandthelife",
  "vine",
  "truevine",
  "door",
  "gate",
  "apostle",
  "highpriest",
  "priest",
  "prophet",
  "faithfulandtrue",
  "amen",
  "alphaandomega",
  "alphaomega",
  "firstandlast",
  "beginningandend",
  "morningstar",
  "brightmorningstar",
  "dayspring",
  "princeofpeace",
  "wonderfulcounselor",
  "wonderfulcounsellor",
  "mightygod",
  "everlastingfather",
  "lionofjudah",
  "rootofjesse",
  "cornerstone",
  "chiefcornerstone",
  "bridegroom",
  "mediator",
  "intercessor",
  // The Holy Spirit
  "holyspirit",
  "holyghost",
  "spirit",
  "spiritofgod",
  "spiritoftruth",
  "spiritofthelord",
  "ruach",
  "ruachhakodesh",
  "ruachelohim",
  "ruachadonai",
  "pneuma",
  "pneumahagion",
  "hagionpneuma",
  "paraclete",
  "comforter",
  "advocate",
  "helper",
  "ruhalqudus",
  // Scripture
  "bible",
  "holybible",
  "scripture",
  "scriptures",
  "godsword",
  "torah",
  "tanakh",
  "tanach",
  "gospel",
  "gospels",
  "newtestament",
  "oldtestament",
  "septuagint",
  "vulgate",
];

/** Other faiths: the names of God and the main deities, and founders by their titles. */
const OTHER_FAITHS = [
  // Islam (the Prophet by title: Muhammad is a common given name)
  "allah",
  "allahu",
  "arrahman",
  "alrahman",
  "arrahim",
  "alrahim",
  "rasulullah",
  "prophetmuhammad",
  "muhammadrasulullah",
  "prophetofallah",
  "quran",
  "koran",
  // Hinduism
  "brahman",
  "ishvara",
  "bhagavan",
  "bhagwan",
  "vishnu",
  "shiva",
  "krishna",
  "lordkrishna",
  "brahma",
  "ganesha",
  "durga",
  "hanuman",
  "vedas",
  "bhagavadgita",
  // Buddhism
  "buddha",
  "gautamabuddha",
  "siddharthagautama",
  "shakyamuni",
  "amitabha",
  "dalailama",
  "tripitaka",
  // Sikhism
  "waheguru",
  "vaheguru",
  "ikonkar",
  "ekonkar",
  "gurunanak",
  "gurugobindsingh",
  "gurugranthsahib",
  // Baha'i, Zoroastrianism, Shinto
  "bahaullah",
  "abdulbaha",
  "ahuramazda",
  "ormazd",
  "zoroaster",
  "zarathustra",
  "amaterasu",
  // Church offices that speak for a church
  "pope",
  "holyfather",
  "vicarofchrist",
];

/** People of the Bible: reserved with a title (`apostle-paul`), never by their name alone. */
const BIBLE_PEOPLE = [
  "peter",
  "simonpeter",
  "andrew",
  "james",
  "john",
  "philip",
  "bartholomew",
  "nathanael",
  "thomas",
  "matthew",
  "thaddeus",
  "jude",
  "judas",
  "simon",
  "matthias",
  "paul",
  "barnabas",
  "silas",
  "timothy",
  "titus",
  "luke",
  "mark",
  "stephen",
  "moses",
  "aaron",
  "samuel",
  "nathan",
  "elijah",
  "elisha",
  "isaiah",
  "jeremiah",
  "ezekiel",
  "daniel",
  "hosea",
  "joel",
  "amos",
  "obadiah",
  "jonah",
  "micah",
  "nahum",
  "habakkuk",
  "zephaniah",
  "haggai",
  "zechariah",
  "malachi",
  "deborah",
  "miriam",
  "huldah",
  "anna",
  "david",
  "solomon",
  "saul",
  "hezekiah",
  "josiah",
  "abraham",
  "isaac",
  "jacob",
  "joseph",
  "noah",
  "sarah",
  "rebekah",
  "rachel",
  "leah",
  "mary",
  "elizabeth",
  "marymagdalene",
];

/** Titles that, with a biblical name, claim to be that person. Not "father" or "mother": priests and nuns are called that. */
const BIBLE_TITLES = [
  "apostle",
  "prophet",
  "prophetess",
  "saint",
  "st",
  "king",
  "queen",
  "patriarch",
  "evangelist",
  "blessed",
  "holy",
  "virgin",
];

const BIBLE_FIGURES = [
  "johnthebaptist",
  "fatherabraham",
  "virginmary",
  "mothermary",
  "blessedvirgin",
  "blessedvirginmary",
  "motherofgod",
  "theotokos",
  "ourlady",
  "maryofnazareth",
  "holyfamily",
];

/** Words in front of a name that don't change who it claims to be. */
const PREFIXES = ["the", "real", "true", "official"];

/** Digits written for the letters they look like. */
const LOOKALIKES: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
};

/** Matched in a normalized form (`normalize`), so `jesus777`, `the-real-god` and `g0d` are caught too. */
const IMPERSONATION = new Set([
  ...STAFF,
  ...GOD,
  ...OTHER_FAITHS,
  ...BIBLE_FIGURES,
  ...BIBLE_TITLES.flatMap((title) => BIBLE_PEOPLE.map((name) => title + name)),
]);

/**
 * A handle reduced to what it claims to be: no hyphens or trailing digits, no leading "the",
 * "real", "true" or "official", and look-alike digits read as letters.
 */
export function normalize(handle: string): string {
  let h = handle.toLowerCase().replaceAll("-", "").replace(/\d+$/, "");
  for (let changed = true; changed; ) {
    changed = false;
    for (const prefix of PREFIXES) {
      if (h.startsWith(prefix) && h.length > prefix.length) {
        h = h.slice(prefix.length);
        changed = true;
      }
    }
  }
  return h.replace(/[013457]/g, (d) => LOOKALIKES[d] ?? d);
}

/**
 * True if no one may take `handle` (already lowercase). The plain form is checked too, since
 * normalizing can strip part of a name (`theos` loses "the").
 */
export function isReservedHandle(handle: string): boolean {
  return (
    EXACT.has(handle) ||
    IMPERSONATION.has(normalize(handle)) ||
    IMPERSONATION.has(handle.replaceAll("-", ""))
  );
}

/** God's names in other scripts, without vowel points or accents, as `nameForm` leaves them. */
const OTHER_SCRIPTS = new Set([
  "יהוה", // the Name, in Hebrew
  "אדני", // Adonai
  "אלהים", // Elohim
  "ישוע", // Yeshua
  "θεοσ", // Theos
  "κυριοσ", // Kyrios
  "ιησουσ", // Iesous
  "χριστοσ", // Christos
  "الله", // Allah
]);

/** The Name: refused anywhere in a display name, since it's never part of a person's name. */
const THE_NAME = ["yhwh", "yhvh", "jhwh", "jhvh", "יהוה"];

/**
 * A display name reduced for matching: accents and vowel points removed (NFKD, so look-alike
 * letters from other blocks fold too), lowercase, final sigma as sigma, then only letters and
 * digits, normalized as a handle is.
 */
export function nameForm(name: string): string {
  const plain = name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replaceAll("ς", "σ")
    .replace(/[^\p{L}\p{N}]/gu, "");
  return normalize(plain);
}

/**
 * True if a display name claims to be one of the reserved names (`God`, `The Lord`,
 * `Apostle Paul`, `Admin`) or contains the Name in any script. Ordinary names that include one
 * (`Godfrey Smith`, `Paul`) are fine. The site paths and published lists don't apply: they only
 * matter in URLs.
 */
export function isReservedName(name: string): boolean {
  const form = nameForm(name);
  return (
    IMPERSONATION.has(form) || OTHER_SCRIPTS.has(form) || THE_NAME.some((n) => form.includes(n))
  );
}
