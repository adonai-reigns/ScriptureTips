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
  /** Canon profile (`@scripturetips/canon`): no default, chosen after the first sign-in. */
  canon: text("canon"),
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
    ...timestamps,
  },
  (t) => [unique().on(t.ownerId, t.slug)],
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
