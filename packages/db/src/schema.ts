/**
 * Scripture text (domain-model §2): translations, their books, verse text and translator's
 * notes, as the import loads them. Then accounts (domain-model §5). Keys are UUIDv7 (§1.1), made by PostgreSQL 18's
 * `uuidv7()`. Generate a migration after every change (`pnpm generate`).
 */

import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/** An inclusive integer range `[start, end]` of passage ordinals (domain-model §2.2). */
export const int4range = customType<{
  data: { start: number; end: number };
  driverData: string;
}>({
  dataType: () => "int4range",
  toDriver: ({ start, end }) => `[${start},${end}]`,
  // PostgreSQL returns a discrete range in canonical form, with an exclusive upper bound.
  fromDriver: (value) => {
    const [, start = "", end = ""] = /^\[(-?\d+),(-?\d+)\)$/.exec(value) ?? [];
    return { start: Number(start), end: Number(end) - 1 };
  },
});

const id = () => uuid("id").primaryKey().default(sql`uuidv7()`);

export const translation = pgTable("translation", {
  id: id(),
  /** The import catalog's ID (`eng-kjv`, `leb`): stable across imports. */
  catalogId: text("catalog_id").notNull().unique(),
  abbreviation: text("abbreviation").notNull(),
  name: text("name").notNull(),
  /** BCP 47 language tag. */
  language: text("language").notNull(),
  direction: text("direction", { enum: ["ltr", "rtl"] }).notNull(),
  /** Versification scheme ID (`kjv`, `hebrew`, …), from @scripturetips/versification. */
  scheme: text("scheme").notNull(),
  /** The license module's key (domain-model §7); what it allows is never stored here. */
  licenseKey: text("license_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Each load of a translation: where it came from and what the import reported. */
export const translationImport = pgTable("translation_import", {
  id: id(),
  translationId: uuid("translation_id")
    .notNull()
    .references(() => translation.id, { onDelete: "cascade" }),
  /** The source file or folder, under source-texts. */
  source: text("source").notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  /** Normalizations, peripheral files, skipped verse numbers: the import report's section. */
  report: jsonb("report").notNull(),
  verseCount: integer("verse_count").notNull(),
  noteCount: integer("note_count").notNull(),
});

export const translationBook = pgTable(
  "translation_book",
  {
    translationId: uuid("translation_id")
      .notNull()
      .references(() => translation.id, { onDelete: "cascade" }),
    /** OSIS book ID. */
    book: text("book").notNull(),
    usfm: text("usfm").notNull(),
    /** Order in the translation. */
    position: integer("position").notNull(),
    /** The translation's own names: header, long, short, abbreviation. */
    names: jsonb("names").notNull(),
  },
  (t) => [primaryKey({ columns: [t.translationId, t.book] })],
);

/**
 * One verse as the translation numbers it, with its markup (`content`, `headings`: the
 * import's inline nodes). Translator's notes are in `translator_note`; the content keeps a
 * `{ type: "note", position }` mark where each note's mark is printed.
 */
export const verseText = pgTable(
  "verse_text",
  {
    id: id(),
    translationId: uuid("translation_id")
      .notNull()
      .references(() => translation.id, { onDelete: "cascade" }),
    book: text("book").notNull(),
    chapter: integer("chapter").notNull(),
    /** 0 for a Psalm heading or the prologue to Sirach (domain-model §2.1). */
    verse: integer("verse").notNull(),
    /** The last verse of a bridged verse ("3-4"). */
    toVerse: integer("to_verse"),
    /** The number as printed, where it differs. */
    published: text("published"),
    /** Canonical verses (OSIS) this verse holds; empty where the canonical scheme lacks it. */
    canonical: text("canonical").array().notNull(),
    /** From the versification mapping: `same`, `renumbered`, `merged`, … */
    mapping: text("mapping").notNull(),
    /** The canonical verses as ordinals, for overlap queries; null where there are none. */
    canonicalRange: int4range("canonical_range"),
    headings: jsonb("headings").notNull(),
    content: jsonb("content").notNull(),
  },
  (t) => [
    unique().on(t.translationId, t.book, t.chapter, t.verse),
    index().using("gist", t.canonicalRange),
    check("verse_bridge", sql`${t.toVerse} IS NULL OR ${t.toVerse} > ${t.verse}`),
  ],
);

/**
 * A translator's note (domain-model §2.6): anchored at its mark in the verse (`position`,
 * counted through the verse's headings, then its content), and to a span of words when
 * `span` names one (the content's `{ type: "span", span }` nodes).
 */
export const translatorNote = pgTable(
  "translator_note",
  {
    id: id(),
    verseTextId: uuid("verse_text_id")
      .notNull()
      .references(() => verseText.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    kind: text("kind", { enum: ["footnote", "endnote", "cross_reference"] }).notNull(),
    /** The USFM marker (`f`, `fe`, `x` …) and caller, as the source has them. */
    marker: text("marker").notNull(),
    caller: text("caller").notNull(),
    /** The publisher's category, e.g. `screen`: shown on screen, left out of print. */
    category: text("category"),
    span: text("span"),
    body: jsonb("body").notNull(),
  },
  (t) => [unique().on(t.verseTextId, t.position)],
);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

/**
 * Accounts (domain-model §5), in the shape Better Auth expects (apps/api/src/auth). Sign-in is a
 * one-time code sent by email, with no passwords (vision §11, Decided), so `email_verified` is
 * true for everyone who has signed in.
 */
export const user = pgTable("user", {
  id: id(),
  /** Display name, in any script. Empty until the user chooses one. */
  name: text("name").notNull().default(""),
  /** Private: never shown to other users. Stored lowercase. */
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  /** `@handle` (domain-model §1.6): lowercase ASCII letters, digits and hyphens. Chosen after the first sign-in. */
  handle: text("handle").unique(),
  /** BCP 47 tag for the interface language. */
  locale: text("locale").notNull().default("en-NZ"),
  /** 0–4 (vision §4): what the account may do beyond private study. */
  trustLevel: integer("trust_level").notNull().default(0),
  ...timestamps,
});

export const session = pgTable(
  "session",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    ...timestamps,
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

/**
 * Better Auth's "account": a way of signing in linked to a user. Named `auth_account` so it
 * isn't mistaken for the user's account.
 */
export const authAccount = pgTable(
  "auth_account",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    /** Unused: there are no passwords. Better Auth's schema has the column. */
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("auth_account_user_idx").on(t.userId)],
);

/** Short-lived values, such as sign-in codes (stored hashed). */
export const verification = pgTable(
  "verification",
  {
    id: id(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);
