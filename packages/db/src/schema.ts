/**
 * Scripture text (domain-model §2): translations, their books, verse text and translator's
 * notes, as the import loads them. Then accounts (domain-model §5). Keys are UUIDv7 (§1.1), made by PostgreSQL 18's
 * `uuidv7()`. Generate a migration after every change (`pnpm generate`).
 */

import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
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

/** PostgreSQL full-text search's document type, kept up to date by the database itself. */
export const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

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
    /**
     * The verse's words as plain text (no notes or headings), for search: written by the import,
     * and by `tools/scripture-import`'s `index` for text loaded before it existed.
     */
    plain: text("plain"),
    /** `plain` for full-text search (English stemming: "forgiving" finds "forgiven"). */
    search: tsvector("search").generatedAlwaysAs(sql`to_tsvector('english', coalesce(plain, ''))`),
  },
  (t) => [
    unique().on(t.translationId, t.book, t.chapter, t.verse),
    index().using("gist", t.canonicalRange),
    index("verse_text_search_idx").using("gin", t.search),
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
  /** Canon profile (`@scripturetips/canon`): no default, chosen after the first sign-in. */
  canon: text("canon"),
  /** 0–4 (vision §4): what the account may do beyond private study. */
  trustLevel: integer("trust_level").notNull().default(0),
  /** The country (`@scripturetips/countries`: ISO 3166-1 alpha-2, and `XK`); null until chosen. */
  country: text("country"),
  /** `female` · `male` · `both`; null until chosen, and not cleared once chosen. */
  gender: text("gender"),
  /** `child` · `teen` · `adult` · `senior`, as the person judges; null until chosen. Not a legal declaration. */
  ageBracket: text("age_bracket"),
  /**
   * Translation catalog IDs (public ones that can be a base) the person favors, in their order.
   * A new account starts with LEB, NET, GNV, KJV and YLT; an ID that isn't loaded is ignored by menus.
   */
  favoriteTranslations: text("favorite_translations")
    .array()
    .notNull()
    .default(sql`'{leb,engnet,enggnv,eng-kjv,engylt}'`),
  /** The order they gave the rest; any not listed (new ones) follow, by name. */
  otherTranslations: text("other_translations").array().notNull().default(sql`'{}'`),
  /** Menus list only the favorites (when there are any). */
  favoritesOnly: boolean("favorites_only").notNull().default(false),
  ...timestamps,
});

/**
 * A person's claim that their country isn't on the list (`@scripturetips/countries`), as they
 * wrote it. **Never shown to anyone until it has been reviewed.** The review, and appeals against
 * its outcome, aren't built yet (vision §11, "Countries not on the list"): until then every claim
 * stays `pending`. One claim per account; a new one replaces the old.
 */
export const countryClaim = pgTable(
  "country_claim",
  {
    id: id(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** What they wrote. */
    name: text("name").notNull(),
    /** `pending` · `accepted` · `declined` (the last two come with the review). */
    status: text("status").notNull().default("pending"),
    ...timestamps,
  },
  (t) => [uniqueIndex("country_claim_user_idx").on(t.userId)],
);

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

/**
 * A compilation (domain-model §2.3): the user's own translation, built on a base. Always
 * private to its owner while it's a draft. `slug` is the abbreviation in lowercase, unique per
 * owner, used in its reader path (`/read/@handle/{slug}`).
 */
export const compilation = pgTable(
  "compilation",
  {
    id: id(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    abbreviation: text("abbreviation").notNull(),
    /** The base translation, which supplies every verse not overridden. (A base publication comes with publishing.) */
    baseTranslationId: uuid("base_translation_id")
      .notNull()
      .references(() => translation.id),
    /** Versification scheme ID: the base's. */
    scheme: text("scheme").notNull(),
    /** The translations the editor compares it with, by catalog ID, in column order (at most 10). */
    compareWith: jsonb("compare_with").$type<string[]>().notNull().default([]),
    ...timestamps,
  },
  (t) => [unique().on(t.ownerId, t.slug)],
);

/**
 * Which translation a verse was last shown in, in a user's compare view of a compilation
 * (domain-model §2.3, `CompareShown`): swiped to on a phone, and shown again next time, on any
 * device. `verse` is the row's first verse (OSIS, the compilation's numbering). A verse shown
 * in the compilation's own wording has no row.
 */
export const compareShown = pgTable(
  "compare_shown",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    compilationId: uuid("compilation_id")
      .notNull()
      .references(() => compilation.id, { onDelete: "cascade" }),
    verse: text("verse").notNull(),
    translationId: uuid("translation_id")
      .notNull()
      .references(() => translation.id, { onDelete: "cascade" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.compilationId, t.verse] })],
);

/**
 * A layered override (domain-model §2.3, `CompilationRule`): verses within `scope` come from
 * `source`. Scopes are canonical ordinal ranges; `entered` keeps the scope as the user gave it
 * (OSIS in the compilation's numbering, or the section ID). The most specific kind wins:
 * range, then chapter, then book, then section. Rules of the same kind never overlap.
 */
export const compilationRule = pgTable(
  "compilation_rule",
  {
    id: id(),
    compilationId: uuid("compilation_id")
      .notNull()
      .references(() => compilation.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["section", "book", "chapter", "range"] }).notNull(),
    scope: int4range("scope").notNull(),
    entered: text("entered").notNull(),
    sourceTranslationId: uuid("source_translation_id")
      .notNull()
      .references(() => translation.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("compilation_rule_compilation_idx").on(t.compilationId)],
);

/**
 * A single-verse choice (domain-model §2.3, `CompilationVerse`): the verse `entered` (OSIS, the
 * compilation's numbering, its first verse if bridged) taken from `source`, or edited from it.
 * `scope` is the verse's canonical range. An `edited` verse keeps a snapshot of the source verse
 * as it was (headings, content and notes, with its hash and import), and its own `content`.
 * An `own` or `pasted` verse is the user's rendering: `content` only, with no source; its
 * evidence is in `authorship_journal` and the tables after it. `ai_assisted` comes later.
 */
export const compilationVerse = pgTable(
  "compilation_verse",
  {
    id: id(),
    compilationId: uuid("compilation_id")
      .notNull()
      .references(() => compilation.id, { onDelete: "cascade" }),
    entered: text("entered").notNull(),
    scope: int4range("scope").notNull(),
    origin: text("origin", {
      enum: ["source", "edited", "pasted", "ai_assisted", "own"],
    }).notNull(),
    editKind: text("edit_kind", { enum: ["correction", "adaptation"] }),
    sourceTranslationId: uuid("source_translation_id").references(() => translation.id),
    /** `{ headings, content, notes }` of the source verse when the edit was made. */
    sourceSnapshot: jsonb("source_snapshot"),
    /** SHA-256 of the snapshot (stable JSON): a changed source verse no longer matches it. */
    sourceHash: text("source_hash"),
    sourceImportId: uuid("source_import_id").references(() => translationImport.id, {
      onDelete: "set null",
    }),
    /** The verse's own wording (inline markup), for every origin but `source`. */
    content: jsonb("content"),
    changeNote: text("change_note"),
    wordCount: integer("word_count"),
    ...timestamps,
  },
  (t) => [
    unique().on(t.compilationId, t.entered),
    check(
      "compilation_verse_edited",
      sql`${t.origin} <> 'edited' OR (${t.editKind} IS NOT NULL AND ${t.sourceTranslationId} IS NOT NULL AND ${t.sourceSnapshot} IS NOT NULL AND ${t.content} IS NOT NULL)`,
    ),
    check(
      "compilation_verse_source",
      sql`${t.origin} <> 'source' OR ${t.sourceTranslationId} IS NOT NULL`,
    ),
    check(
      "compilation_verse_own",
      sql`${t.origin} NOT IN ('own', 'pasted') OR (${t.content} IS NOT NULL AND ${t.sourceTranslationId} IS NULL)`,
    ),
  ],
);

/**
 * Every save of a single-verse choice, and every reset (`origin` null), kept when the choice is
 * removed (domain-model §1.3). Deleted with the compilation.
 */
export const compilationVerseRevision = pgTable(
  "compilation_verse_revision",
  {
    id: id(),
    compilationId: uuid("compilation_id")
      .notNull()
      .references(() => compilation.id, { onDelete: "cascade" }),
    entered: text("entered").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    origin: text("origin", { enum: ["source", "edited", "pasted", "ai_assisted", "own"] }),
    editKind: text("edit_kind", { enum: ["correction", "adaptation"] }),
    sourceTranslationId: uuid("source_translation_id").references(() => translation.id),
    content: jsonb("content"),
    changeNote: text("change_note"),
    /** The verse's `compilation_note` rows after this save, as `{ position, origin, … }`. */
    notes: jsonb("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("compilation_verse_revision_idx").on(t.compilationId, t.entered)],
);

/**
 * A translator's note as the compilation has it (domain-model §2.3, `CompilationNote`), where it
 * differs from the source verse's: `modified` (the source note at `position`, reworded, with a
 * snapshot of it in `source_note`), `original` with `removed` (the source note left out), or
 * `own` (the user's, marked after the verse's word `after`). Unchanged source notes have no row.
 * `position` is the note's key within its verse, as in `translator_note`.
 */
export const compilationNote = pgTable(
  "compilation_note",
  {
    id: id(),
    compilationVerseId: uuid("compilation_verse_id")
      .notNull()
      .references(() => compilationVerse.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    origin: text("origin", { enum: ["original", "modified", "own"] }).notNull(),
    removed: boolean("removed").notNull().default(false),
    /** The source note as it was when first changed (`original` and `modified`). */
    sourceNote: jsonb("source_note"),
    /** Inline markup, like `translator_note.body`; null for a removed note. */
    body: jsonb("body"),
    /** For an `own` note: the number of the verse's words before its mark. */
    after: integer("after"),
    ...timestamps,
  },
  (t) => [
    unique().on(t.compilationVerseId, t.position),
    check(
      "compilation_note_origin",
      sql`CASE ${t.origin}
        WHEN 'original' THEN ${t.removed} AND ${t.sourceNote} IS NOT NULL AND ${t.body} IS NULL
        WHEN 'modified' THEN NOT ${t.removed} AND ${t.sourceNote} IS NOT NULL AND ${t.body} IS NOT NULL
        ELSE NOT ${t.removed} AND ${t.sourceNote} IS NULL AND ${t.body} IS NOT NULL AND ${t.after} IS NOT NULL AND ${t.after} >= 0
      END`,
    ),
  ],
);

/**
 * One session of writing an own rendering (domain-model §2.3.1, `AuthorshipJournal`), private to
 * its author. `start_text` is what the session began from (empty, or the rendering it revises);
 * `text` is the wording its events have made so far, and `head_hash` the hash of its last event
 * (or of the journal itself, before any). Deleted with the rendering.
 */
export const authorshipJournal = pgTable(
  "authorship_journal",
  {
    id: id(),
    compilationId: uuid("compilation_id")
      .notNull()
      .references(() => compilation.id, { onDelete: "cascade" }),
    entered: text("entered").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    startText: text("start_text").notNull(),
    text: text("text").notNull(),
    headHash: text("head_hash").notNull(),
    events: integer("events").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("authorship_journal_verse_idx").on(t.compilationId, t.entered)],
);

/**
 * A burst of writing in the editor (domain-model §2.3.1, `CompositionEvent`): at `position`,
 * `removed` was replaced by `inserted`. A paste records where its text came from: `internal`
 * (a translation shown in ScriptureTips, `paste_translation_id`) or `external`. Each `hash`
 * covers the event and `prev_hash`, so the chain shows any later change.
 */
export const compositionEvent = pgTable(
  "composition_event",
  {
    id: id(),
    journalId: uuid("journal_id")
      .notNull()
      .references(() => authorshipJournal.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull(),
    /** Milliseconds since the session started, by the editor's clock. */
    elapsed: integer("elapsed"),
    kind: text("kind", {
      enum: ["insert", "delete", "replace", "paste", "undo", "redo"],
    }).notNull(),
    position: integer("position").notNull(),
    removed: text("removed").notNull(),
    inserted: text("inserted").notNull(),
    pasteOrigin: text("paste_origin", { enum: ["internal", "external"] }),
    pasteTranslationId: uuid("paste_translation_id").references(() => translation.id, {
      onDelete: "set null",
    }),
    prevHash: text("prev_hash").notNull(),
    hash: text("hash").notNull(),
  },
  (t) => [unique().on(t.journalId, t.seq)],
);

/**
 * What the author had in view while writing (domain-model §2.3.1, `StudyTrail`). So far the
 * translations the editor showed; original-language tools come with §2.4.
 */
export const studyTrail = pgTable(
  "study_trail",
  {
    id: id(),
    journalId: uuid("journal_id")
      .notNull()
      .references(() => authorshipJournal.id, { onDelete: "cascade" }),
    at: timestamp("at", { withTimezone: true }).notNull(),
    resource: text("resource", { enum: ["translation_viewed"] }).notNull(),
    translationId: uuid("translation_id").references(() => translation.id, {
      onDelete: "set null",
    }),
  },
  (t) => [index("study_trail_journal_idx").on(t.journalId)],
);

/**
 * How closely a rendering's words follow one translation's (domain-model §2.3.1,
 * `SimilarityReport`), computed when it's saved: `score` in percent, `matched` the runs of words
 * they share. `text_hash` is the rendering's.
 */
export const similarityReport = pgTable(
  "similarity_report",
  {
    id: id(),
    compilationId: uuid("compilation_id")
      .notNull()
      .references(() => compilation.id, { onDelete: "cascade" }),
    entered: text("entered").notNull(),
    translationId: uuid("translation_id")
      .notNull()
      .references(() => translation.id, { onDelete: "cascade" }),
    textHash: text("text_hash").notNull(),
    score: integer("score").notNull(),
    matched: jsonb("matched").$type<string[]>().notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.compilationId, t.entered, t.translationId)],
);

/**
 * The author's good-faith declaration that a rendering is their own composition
 * (domain-model §2.3.1, `AuthorshipDeclaration`), of the statement version they were shown, over
 * the text with hash `text_hash` and the journal chain as it stood (`chain_head`).
 */
export const authorshipDeclaration = pgTable(
  "authorship_declaration",
  {
    id: id(),
    compilationId: uuid("compilation_id")
      .notNull()
      .references(() => compilation.id, { onDelete: "cascade" }),
    entered: text("entered").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    statementVersion: integer("statement_version").notNull(),
    textHash: text("text_hash").notNull(),
    journalId: uuid("journal_id").references(() => authorshipJournal.id, {
      onDelete: "set null",
    }),
    chainHead: text("chain_head"),
    declaredAt: timestamp("declared_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("authorship_declaration_verse_idx").on(t.compilationId, t.entered)],
);

/**
 * A published compilation (domain-model §2.3, `Publication`): its stable identity. Created on
 * the first publish and kept if the compilation is deleted. `public_id` is for URLs and the
 * canonical URI (§1.1); `slug` is unique per owner and never reused for other content (§1.6).
 * `unlisted` is read only at a pinned version's link; `public` also at its latest path.
 */
export const publication = pgTable(
  "publication",
  {
    id: id(),
    publicId: text("public_id").notNull().unique(),
    compilationId: uuid("compilation_id").references(() => compilation.id, {
      onDelete: "set null",
    }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => user.id),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    abbreviation: text("abbreviation").notNull(),
    visibility: text("visibility", { enum: ["unlisted", "public"] }).notNull(),
    status: text("status", { enum: ["active", "withdrawn"] })
      .notNull()
      .default("active"),
    /** The base translation and its scheme: the publication's numbering. */
    baseTranslationId: uuid("base_translation_id")
      .notNull()
      .references(() => translation.id),
    scheme: text("scheme").notNull(),
    ...timestamps,
  },
  (t) => [unique().on(t.ownerId, t.slug)],
);

/**
 * One published version of a publication (domain-model §2.3, `PublicationVersion`), never
 * changed after publishing. Its verses are in `publication_chapter`; `meta` holds the rest of
 * the snapshot (title, credits, sources, license composition). `content_hash` covers the meta
 * and every chapter's hash, and the previous version's hash, so the versions form a chain.
 */
export const publicationVersion = pgTable(
  "publication_version",
  {
    id: id(),
    publicId: text("public_id").notNull().unique(),
    publicationId: uuid("publication_id")
      .notNull()
      .references(() => publication.id),
    number: integer("number").notNull(),
    status: text("status", { enum: ["in_review", "published", "removed"] }).notNull(),
    meta: jsonb("meta").notNull(),
    changeNote: text("change_note"),
    /** What changed since the previous version: `{ verses, changed: [OSIS …] }`. */
    changeSummary: jsonb("change_summary"),
    verseCount: integer("verse_count").notNull(),
    contentHash: text("content_hash").notNull(),
    previousHash: text("previous_hash"),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.publicationId, t.number)],
);

/** One chapter of a publication version: its verses as readers get them, and their hash. */
export const publicationChapter = pgTable(
  "publication_chapter",
  {
    versionId: uuid("version_id")
      .notNull()
      .references(() => publicationVersion.id),
    book: text("book").notNull(),
    chapter: integer("chapter").notNull(),
    /** The book's place in the publication, for listing books in order. */
    position: integer("position").notNull(),
    verses: jsonb("verses").notNull(),
    hash: text("hash").notNull(),
  },
  (t) => [primaryKey({ columns: [t.versionId, t.book, t.chapter] })],
);

/**
 * A request to publish a compilation (domain-model §1.4, `PublishRequest`): the scope, the
 * consent statement the user accepted, and how it went. `checking` while the automated checks
 * run; `returned` with `problems` when they find any; `published` with the version made, and
 * `review` saying what reviewed it (only the automated license check, until moderation exists).
 * `in_review` is for content review, which comes later. Kept as the record of each publish.
 */
export const publishRequest = pgTable(
  "publish_request",
  {
    id: id(),
    compilationId: uuid("compilation_id").references(() => compilation.id, {
      onDelete: "set null",
    }),
    publicationId: uuid("publication_id").references(() => publication.id),
    versionId: uuid("version_id").references(() => publicationVersion.id),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => user.id),
    visibility: text("visibility", { enum: ["unlisted", "public"] }).notNull(),
    /** The version of the consent statement the user accepted, and when. */
    consentStatement: integer("consent_statement").notNull(),
    consentedAt: timestamp("consented_at", { withTimezone: true }).notNull().defaultNow(),
    status: text("status", {
      enum: ["checking", "in_review", "published", "returned"],
    }).notNull(),
    problems: jsonb("problems").notNull().default([]),
    warnings: jsonb("warnings").notNull().default([]),
    review: jsonb("review"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("publish_request_compilation_idx").on(t.compilationId, t.createdAt)],
);

/**
 * A PDF build of a compilation (book-designer.md §8, `EditionBuild`; editions come later). Its
 * files are kept in the file store under `pdf-builds/{id}/` (packages/book `BUILD_FILES`); the
 * PDF worker renders it from the queue (book-designer.md §9). Deleted with its compilation.
 */
export const pdfBuild = pgTable(
  "pdf_build",
  {
    id: id(),
    compilationId: uuid("compilation_id")
      .notNull()
      .references(() => compilation.id, { onDelete: "cascade" }),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => user.id),
    /** What it covers, as entered ("Ruth"), or null for the whole compilation. */
    scope: text("scope"),
    status: text("status", { enum: ["queued", "building", "done", "failed"] }).notNull(),
    pages: integer("pages"),
    /** The cover's spine width, in mm. */
    spine: real("spine"),
    error: text("error"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    index("pdf_build_compilation_idx").on(t.compilationId, t.requestedAt),
    index("pdf_build_requested_by_idx").on(t.requestedBy, t.requestedAt),
  ],
);

/*
 * Original-language data (domain-model §2.4): the Hebrew and Greek texts word by word, the
 * lexicons, proper names, and how translations rendered each word. Loaded by
 * `tools/original-import`; each source keeps its own license key.
 */

/** One edition of an original-language text, e.g. TAHOT (Hebrew OT) or TAGNT (Greek NT). */
export const sourceText = pgTable("source_text", {
  id: id(),
  /** The import's ID (`tahot`, `tagnt`): stable across imports. */
  catalogId: text("catalog_id").notNull().unique(),
  name: text("name").notNull(),
  language: text("language", { enum: ["heb", "grc"] }).notNull(),
  /** E.g. `Masoretic`, `Textus Receptus, critical and Byzantine`. */
  tradition: text("tradition").notNull(),
  /** The license module's key (domain-model §7). */
  licenseKey: text("license_key").notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  /** What the import reported: counts, rows skipped and why. */
  report: jsonb("report").notNull(),
});

/** A dictionary: Strong's, Brown-Driver-Briggs, Abbott-Smith. */
export const lexicon = pgTable("lexicon", {
  id: id(),
  catalogId: text("catalog_id").notNull().unique(),
  name: text("name").notNull(),
  author: text("author").notNull(),
  year: integer("year"),
  language: text("language", { enum: ["heb", "grc"] }).notNull(),
  licenseKey: text("license_key").notNull(),
  importedAt: timestamp("imported_at", { withTimezone: true }).notNull().defaultNow(),
  report: jsonb("report").notNull(),
});

/**
 * A person, place or other proper name from STEPBible's TIPNR, one row per individual
 * (`Abraham@Gen.11.26-1Pe`). The descriptions were written by an AI (domain-model §2.4).
 */
export const properName = pgTable("proper_name", {
  id: id(),
  /** TIPNR's unique name, e.g. `Abram|Abraham@Gen.11.26-1Pe`. */
  tipnrId: text("tipnr_id").notNull().unique(),
  /** The most common form, e.g. `Abraham`. */
  name: text("name").notNull(),
  kind: text("kind", { enum: ["person", "place", "place_person", "other"] }).notNull(),
  /** The disambiguated Strong's numbers the name is tagged with. */
  strongs: text("strongs").array().notNull(),
  /** A short description, and TIPNR's longer summary. */
  description: text("description"),
  summary: text("summary"),
  /** Parents, siblings, partners, offspring, tribe, the briefest description and the article. */
  details: jsonb("details"),
  aiGenerated: boolean("ai_generated").notNull().default(true),
});

/**
 * A word's dictionary identity. `strong` is Strong's number (`H7225`, `G0976`); STEPBible's
 * extended (disambiguated) number (`H7225G`) tells apart lemmas that share one, and gives
 * `key`. Every Strong's number has a base lemma (no extended number) that the lexicon entries
 * hang from; an extended lemma points to it. Strong's numbers are attributes, not identity
 * (one number can cover several lemmas, and some are unused).
 */
export const lemma = pgTable(
  "lemma",
  {
    id: id(),
    language: text("language", { enum: ["heb", "arc", "grc"] }).notNull(),
    strong: text("strong").notNull(),
    extendedStrong: text("extended_strong"),
    /** `extended_strong`, or `strong` for a base lemma: unique. */
    key: text("key").notNull().unique(),
    baseLemmaId: uuid("base_lemma_id").references((): AnyPgColumn => lemma.id),
    /** The dictionary form, with its vowels (Hebrew) or accents (Greek). */
    headword: text("headword"),
    transliteration: text("transliteration"),
    /** Part of speech, as the dictionary or the morphology code gives it. */
    partOfSpeech: text("part_of_speech"),
    nameKind: text("name_kind", { enum: ["person", "place", "other"] }),
    properNameId: uuid("proper_name_id").references(() => properName.id),
    /** STEPBible's brief gloss. */
    gloss: text("gloss"),
  },
  (t) => [index("lemma_strong_idx").on(t.strong), index("lemma_base_idx").on(t.baseLemmaId)],
);

/** One dictionary's entry for a lemma (a base lemma; domain-model §2.4 `LexiconEntry`). */
export const lexiconEntry = pgTable(
  "lexicon_entry",
  {
    id: id(),
    lexiconId: uuid("lexicon_id")
      .notNull()
      .references(() => lexicon.id, { onDelete: "cascade" }),
    lemmaId: uuid("lemma_id")
      .notNull()
      .references(() => lemma.id, { onDelete: "cascade" }),
    /** The dictionary's own entry ID (a BDB `a.aa.ab`, an Abbott-Smith lemma), if it has one. */
    entryRef: text("entry_ref").notNull().default(""),
    headword: text("headword"),
    /** The entry's parts: `{ source, meaning, usage, definition, … }` as the dictionary gives them. */
    body: jsonb("body").notNull(),
  },
  (t) => [
    unique().on(t.lexiconId, t.lemmaId, t.entryRef),
    index("lexicon_entry_lemma_idx").on(t.lemmaId),
  ],
);

/**
 * One original-language word in a verse (domain-model §2.4 `Token`), in the source's own
 * numbering (`canonical_range` through the versification scheme). A Hebrew word's prefixes
 * and suffixes are `affixes`; `lemma_id` is its root.
 */
export const token = pgTable(
  "token",
  {
    id: id(),
    sourceTextId: uuid("source_text_id")
      .notNull()
      .references(() => sourceText.id, { onDelete: "cascade" }),
    book: text("book").notNull(),
    chapter: integer("chapter").notNull(),
    verse: integer("verse").notNull(),
    /** The word's place in the verse (the source's own number). */
    position: integer("position").notNull(),
    /** Which reading: `L` Leningrad, `Q` Qere, `R` restored, `X` from the LXX; Greek: `NKO` … */
    reading: text("reading").notNull(),
    surface: text("surface").notNull(),
    transliteration: text("transliteration"),
    lemmaId: uuid("lemma_id").references(() => lemma.id),
    /** The individual a Hebrew name refers to (TAHOT's tag, e.g. `Abram»Abraham@Gen.11.26-1Pe`). */
    properNameId: uuid("proper_name_id").references(() => properName.id),
    /** Prefix and suffix morphemes, in order: `[{ strong, form, gloss, role }]`. */
    affixes: jsonb("affixes"),
    /** The source's morphology code (`HNcfsa`, `N-NSF`), and its expansion. */
    morphology: text("morphology"),
    gloss: text("gloss"),
    /** Greek: the editions that have the word (`SBL`, `TR`, `Byz` …). */
    editions: text("editions").array(),
    canonical: text("canonical").array().notNull(),
    canonicalRange: int4range("canonical_range"),
  },
  (t) => [
    unique().on(t.sourceTextId, t.book, t.chapter, t.verse, t.position, t.reading),
    index("token_lemma_idx").on(t.lemmaId),
    index().using("gist", t.canonicalRange),
  ],
);

/**
 * How a published translation rendered an original word (domain-model §2.4
 * `TranslationAlignment`): a tagged English word (`position` among the verse's `w` nodes),
 * its Strong's number, and, where it resolves, the lemma and the one token it renders.
 * Derived from the Strong's tags in the verse text.
 */
export const translationAlignment = pgTable(
  "translation_alignment",
  {
    id: id(),
    verseTextId: uuid("verse_text_id")
      .notNull()
      .references(() => verseText.id, { onDelete: "cascade" }),
    /** Which of the verse's words, counting every `w` node from 0. */
    position: integer("position").notNull(),
    /** The number as tagged, normalized (`H0430`); a word with two numbers has two rows. */
    strong: text("strong").notNull(),
    lemmaId: uuid("lemma_id").references(() => lemma.id),
    tokenId: uuid("token_id").references(() => token.id, { onDelete: "set null" }),
  },
  (t) => [
    unique().on(t.verseTextId, t.position, t.strong),
    index("translation_alignment_lemma_idx").on(t.lemmaId),
    index("translation_alignment_token_idx").on(t.tokenId),
  ],
);
