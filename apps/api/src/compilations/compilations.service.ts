import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  and,
  asc,
  compilation,
  compilationNote,
  compilationRule,
  compilationVerse,
  compilationVerseRevision,
  desc,
  eq,
  inArray,
  sql,
  translation,
  translationImport,
  verseText,
} from "@scripturetips/db";
import { canBeBase, canCompile, canModify, correctionLimit } from "@scripturetips/licenses";
import {
  BOOKS,
  formatOsisPassage,
  type OrdinalRange,
  type Passage,
  parseOsisPassage,
  toOrdinalRange,
} from "@scripturetips/passage";
import { formatPassage, parseReference, type VerseCounts } from "@scripturetips/reference";
import type { SchemeId } from "@scripturetips/versification";
import type { User } from "../auth/session.ts";
import { DATABASE, type Database, isUniqueViolation } from "../database.ts";
import {
  MAX_VERSES,
  type PassageResult,
  type PassageVerse,
  type StoredVerse,
  type TranslationBookSummary,
  type TranslationSummary,
  TranslationsService,
  wholeChapters,
} from "../translations/translations.service.ts";
import {
  AUTHORSHIP_STATEMENT,
  AuthorshipService,
  type AuthorshipSummary,
  type Candidate,
  type EventInput,
} from "./authorship.service.ts";
import { textHash } from "./journal.ts";
import {
  compiledNotes,
  MAX_OWN_NOTES,
  type NoteEditView,
  type NoteRow,
  nextPosition,
  noteEditViews,
  revisionNotes,
} from "./notes.ts";
import { type Layer, layersFor, matchingVerse, type RuleKind } from "./resolve.ts";
import { similarity } from "./similarity.ts";
import {
  applyWording,
  changes,
  editableText,
  type Inline,
  noteText,
  rewordNote,
  snapshotHash,
  wordCount,
  wordsIn,
} from "./wording.ts";

export const SECTIONS = ["ot", "nt", "additional"] as const;
export type SectionId = (typeof SECTIONS)[number];

/** A section's ordinal range: its registry books are numbered contiguously. */
function sectionRange(id: SectionId): OrdinalRange {
  const numbers = BOOKS.filter((b) => b.group === id).map((b) => b.number);
  return {
    start: Math.min(...numbers) * 10_000_000,
    end: Math.max(...numbers) * 10_000_000 + 9_999_999,
  };
}

interface SourceView {
  readonly id: string;
  readonly abbreviation: string;
  readonly name: string;
}

export interface RuleView {
  readonly id: string;
  readonly kind: RuleKind;
  /** The section ID, or OSIS in the compilation's numbering. */
  readonly entered: string;
  /** For display: the section ID, or "Genesis 1:1–5". */
  readonly label: string;
  readonly source: SourceView;
}

export interface CompilationSummary {
  /** `@handle/slug`: the reader's ID for it. */
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly abbreviation: string;
  readonly base: SourceView;
  /** The base's language and direction: the compilation's, until own wording comes (slice 2). */
  readonly language: string;
  readonly direction: "ltr" | "rtl";
}

export type EditKind = "correction" | "adaptation";
/** The user's own wording (domain-model §2.3): `pasted` until declared their own. */
export type Rendering = "own" | "pasted";

/** A single-verse choice (domain-model §2.3, `CompilationVerse`). */
export interface VerseChoiceView {
  readonly id: string;
  /** OSIS in the compilation's numbering: "Gen.1.3". */
  readonly entered: string;
  /** For display: "Genesis 1:3". */
  readonly label: string;
  readonly origin: "source" | "edited" | Rendering;
  readonly editKind: EditKind | null;
  /** The translation it was taken or edited from; null for the user's own wording. */
  readonly source: SourceView | null;
  readonly changeNote: string | null;
  /** True when an edited verse's source has changed (or gone) since the edit. */
  readonly sourceChanged: boolean;
}

export interface CompilationView extends CompilationSummary {
  readonly scheme: string;
  readonly rules: RuleView[];
  readonly verses: VerseChoiceView[];
  /** The translations the editor compares it with (catalog IDs), in column order. */
  readonly compareWith: string[];
}

/** The most translations the editor compares a compilation with at once. */
export const MAX_COMPARE = 10;

/**
 * A passage of the compilation beside other translations (the editor's compare and edit
 * modes): one row per verse of the compilation, each with the verses of every compared
 * translation that cover the same canonical verses, so they line up whatever their numbering.
 * A compared verse spanning several rows is shown in the first.
 */
export interface CompareView {
  readonly label: string;
  /** OSIS, in the compilation's numbering. */
  readonly entered: string;
  readonly columns: {
    readonly id: string;
    readonly abbreviation: string;
    readonly name: string;
    readonly direction: "ltr" | "rtl";
    /** Whether a compilation may take its verses (its license allows compiling). */
    readonly compilable: boolean;
  }[];
  readonly rows: {
    readonly verse: CompilationVerse;
    /** One list per column, in column order. */
    readonly compare: PassageVerse[][];
  }[];
}

/**
 * A compilation's verse, with the translation it was taken from (`source`, a catalog ID), and
 * `edit` where the compilation changed its wording; or `rendering`, the user's own, with no
 * source.
 */
export type CompilationVerse = PassageVerse & {
  readonly source?: string;
  readonly edit?: EditKind;
  readonly rendering?: Rendering;
};

/** One book of a compilation as a publication snapshot takes it: its chapters' resolved verses. */
export interface SnapshotBook {
  readonly osis: string;
  readonly chapters: { readonly chapter: number; readonly verses: CompilationVerse[] }[];
}

/**
 * Where a compilation's verses come from, for the editor's chart: each translation's count and
 * share (in percent, one decimal), largest first, then the user's own wording.
 */
export interface CompositionView {
  readonly verses: number;
  readonly sources: {
    readonly id: string;
    readonly abbreviation: string;
    readonly name: string;
    readonly verses: number;
    readonly share: number;
  }[];
  readonly own: { readonly verses: number; readonly share: number };
}

/** The whole compilation, resolved, for publishing (`CompilationsService.snapshot`). */
export interface CompilationSnapshot {
  readonly compilation: typeof compilation.$inferSelect;
  readonly base: typeof translation.$inferSelect;
  readonly books: SnapshotBook[];
  /** Each translation its verses came from, with how many. */
  readonly sources: {
    readonly translation: typeof translation.$inferSelect;
    readonly verses: number;
  }[];
  /** Verses of the user's own wording, and those corrected or adapted. */
  readonly own: number;
  readonly corrected: number;
  readonly adapted: number;
  /** Verses still `pasted` (not declared the user's own): labels, e.g. "Genesis 1:3". */
  readonly pasted: string[];
}

/** What the verse editor shows: the verse as the compilation has it, and every translation's. */
export interface VerseEditorView {
  readonly label: string;
  readonly entered: string;
  readonly current: {
    readonly origin: VerseChoiceView["origin"];
    readonly source: SourceView | null;
    readonly edit: EditKind | null;
    readonly text: string;
  };
  readonly choice: VerseChoiceView | null;
  /** For the user's own wording: its evidence (domain-model §2.3.1). */
  readonly authorship: AuthorshipSummary | null;
  /** The declaration statement's version the editor must show (`AUTHORSHIP_STATEMENT`). */
  readonly statement: number;
  /**
   * The verse's translator's notes, to change (domain-model §2.3): null when its translation's
   * license doesn't allow changes.
   */
  readonly notes: NoteEditView[] | null;
  /** The verse's words, as written: an own note is marked after one of them. */
  readonly words: string[];
  readonly options: readonly {
    readonly translation: SourceView;
    readonly text: string;
    /** Its license lets the wording be changed. */
    readonly modifiable: boolean;
    readonly correctionLimit: number;
  }[];
}

/** A source verse as an edit found it: what `sourceHash` is taken over. */
interface Snapshot {
  readonly headings: unknown;
  readonly content: Inline[];
  readonly notes: PassageVerse["notes"];
}

const snapshotOf = (v: PassageVerse): Snapshot => ({
  headings: v.headings,
  content: v.content as Inline[],
  notes: v.notes,
});

type ChoiceRow = typeof compilationVerse.$inferSelect;
type VerseRow = Omit<typeof compilationVerse.$inferInsert, "compilationId" | "entered" | "scope">;
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/** The verse a save is for: the compilation, its base, the base verse and its `entered`. */
interface VerseAt {
  readonly c: typeof compilation.$inferSelect;
  readonly base: typeof translation.$inferSelect;
  readonly verse: StoredVerse;
  readonly entered: string;
}

/**
 * The user's own wording as the verse's content: the base verse's opening paragraph marks and
 * headings, then the text.
 */
function ownContent(verse: StoredVerse, text: string): Inline[] {
  const lead: Inline[] = [];
  for (const n of verse.content as Inline[]) {
    if (typeof n === "string") {
      if (n.trim() === "") continue;
      break;
    }
    if (n.type === "block" || n.type === "heading") lead.push(n);
    else if (n.type !== "note") break;
  }
  return [...lead, text];
}

/** One change to a verse's notes (`changeNote`). */
export type NoteChange =
  | { readonly add: { readonly text: string; readonly after: number } }
  | {
      readonly position: number;
      readonly text?: string | undefined;
      readonly after?: number | undefined;
      readonly removed?: true | undefined;
      readonly restore?: true | undefined;
    };

export type RuleScope = { readonly section: SectionId } | { readonly reference: string };

/**
 * Compilations (domain-model §2.3, stage 1): a base with layered rules, private to the owner.
 * Every verse is resolved through the layers when read (`resolve.ts`).
 */
@Injectable()
export class CompilationsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(TranslationsService) private readonly translations: TranslationsService,
    @Inject(AuthorshipService) private readonly authorship: AuthorshipService,
  ) {}

  async list(owner: User): Promise<CompilationSummary[]> {
    const rows = await this.db
      .select({ c: compilation, base: translation })
      .from(compilation)
      .innerJoin(translation, eq(translation.id, compilation.baseTranslationId))
      .where(eq(compilation.ownerId, owner.id))
      .orderBy(asc(compilation.title));
    return rows.map(({ c, base }) => summary(owner, c, base));
  }

  async create(
    owner: User,
    input: { title: string; abbreviation: string; base: string },
  ): Promise<CompilationView> {
    if (!owner.handle) throw new BadRequestException({ code: "handle-required" });
    const [base] = await this.db
      .select()
      .from(translation)
      .where(eq(translation.catalogId, input.base));
    if (!base) throw new BadRequestException({ code: "unknown-translation" });
    if (!canBeBase(base.licenseKey)) throw new BadRequestException({ code: "base-not-allowed" });
    await this.refuseTranslationName(input.title, input.abbreviation);
    try {
      const [created] = await this.db
        .insert(compilation)
        .values({
          ownerId: owner.id,
          slug: input.abbreviation.toLowerCase(),
          title: input.title,
          abbreviation: input.abbreviation,
          baseTranslationId: base.id,
          scheme: base.scheme,
        })
        .returning();
      if (!created) throw new Error("no compilation");
      return {
        ...summary(owner, created, base),
        scheme: created.scheme,
        compareWith: created.compareWith,
        rules: [],
        verses: [],
      };
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException({ code: "abbreviation-taken" });
      throw e;
    }
  }

  /** Sets the translations the editor compares it with, in column order. */
  async setCompareWith(owner: User, slug: string, ids: string[]): Promise<CompilationView> {
    const { c } = await this.find(owner, slug);
    const unique = [...new Set(ids)];
    if (unique.length > 0) {
      const known = await this.db
        .select({ id: translation.catalogId })
        .from(translation)
        .where(inArray(translation.catalogId, unique));
      if (known.length !== unique.length)
        throw new BadRequestException({ code: "unknown-translation" });
    }
    await this.db.update(compilation).set({ compareWith: unique }).where(eq(compilation.id, c.id));
    return this.view(owner, slug);
  }

  /** One passage (a chapter, usually) of the compilation beside `withIds` (CompareView). */
  async compare(
    owner: User,
    slug: string,
    reference: string,
    withIds: string[],
  ): Promise<CompareView> {
    const { base } = await this.find(owner, slug);
    const { passages } = await this.passage(owner, slug, reference);
    const [p, ...more] = passages;
    if (!p || more.length > 0) throw new BadRequestException({ code: "one-reference" });
    // The base's verses again, for their canonical ranges (the resolved ones don't carry them).
    const baseVerses = await this.translations.versesIn(base.id, parseOsisPassage(p.entered));
    const ranges = baseVerses.map((v) => v.range);
    const known = ranges.filter((r): r is OrdinalRange => r !== null);
    const span = known.length
      ? {
          start: Math.min(...known.map((r) => r.start)),
          end: Math.max(...known.map((r) => r.end)),
        }
      : null;
    const rows = await this.db
      .select()
      .from(translation)
      .where(inArray(translation.catalogId, withIds.length ? withIds : [""]));
    const columns = withIds.flatMap((id) => {
      const t = rows.find((r) => r.catalogId === id);
      return t ? [t] : [];
    });
    const compare = await Promise.all(
      columns.map(async (t) => {
        const cells: PassageVerse[][] = p.verses.map(() => []);
        if (!span) return cells;
        for (const v of await this.translations.versesOverlapping(t.id, span)) {
          const { range, ...verse } = v;
          const at = range
            ? ranges.findIndex((r) => r && r.start <= range.end && range.start <= r.end)
            : -1;
          if (at >= 0) cells[at]?.push(verse);
        }
        return cells;
      }),
    );
    return {
      label: p.label,
      entered: p.entered,
      columns: columns.map((t) => ({
        id: t.catalogId,
        abbreviation: t.abbreviation,
        name: t.name,
        direction: t.direction as "ltr" | "rtl",
        compilable: canCompile(t.licenseKey),
      })),
      rows: p.verses.map((verse, i) => ({
        verse,
        compare: compare.map((cells) => cells[i] ?? []),
      })),
    };
  }

  /**
   * Takes several verses at once, each unchanged from its source (the editor's edit mode), in
   * order. Each is saved as a single verse taken on its own would be.
   */
  async takeVerses(
    owner: User,
    slug: string,
    choices: { reference: string; source: string }[],
  ): Promise<{ saved: number }> {
    for (const choice of choices) await this.saveVerse(owner, slug, choice);
    return { saved: choices.length };
  }

  /**
   * Renames the compilation: its title, or its abbreviation (and with it the slug in its path),
   * checked as when it was created.
   */
  async rename(
    owner: User,
    slug: string,
    input: { title?: string | undefined; abbreviation?: string | undefined },
  ): Promise<CompilationView> {
    const { c } = await this.find(owner, slug);
    const title = input.title ?? c.title;
    const abbreviation = input.abbreviation ?? c.abbreviation;
    await this.refuseTranslationName(title, abbreviation);
    try {
      await this.db
        .update(compilation)
        .set({ title, abbreviation, slug: abbreviation.toLowerCase() })
        .where(eq(compilation.id, c.id));
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException({ code: "abbreviation-taken" });
      throw e;
    }
    return this.view(owner, abbreviation);
  }

  /** A compilation mustn't pass for a published translation (e.g. the WEB's name rule, licenses.md §3.3). */
  private async refuseTranslationName(title: string, abbreviation: string): Promise<void> {
    const [clash] = await this.db
      .select({ id: translation.id })
      .from(translation)
      .where(
        sql`lower(${translation.abbreviation}) = ${abbreviation.toLowerCase()} or lower(${translation.name}) = ${title.toLowerCase()}`,
      );
    if (clash) throw new BadRequestException({ code: "name-of-translation" });
  }

  async view(owner: User, slug: string): Promise<CompilationView> {
    const { c, base } = await this.find(owner, slug);
    const counts = await this.translations.verseCounts(base.id);
    const rules = await this.db
      .select({ r: compilationRule, source: translation })
      .from(compilationRule)
      .innerJoin(translation, eq(translation.id, compilationRule.sourceTranslationId))
      .where(eq(compilationRule.compilationId, c.id))
      .orderBy(asc(sql`lower(${compilationRule.scope})`), asc(compilationRule.kind));
    return {
      ...summary(owner, c, base),
      scheme: c.scheme,
      compareWith: c.compareWith,
      verses: await this.choiceViews(c.id, counts),
      rules: rules.map(({ r, source }) => ({
        id: r.id,
        kind: r.kind,
        entered: r.entered,
        label:
          r.kind === "section"
            ? r.entered
            : formatPassage(parseOsisPassage(r.entered), { verses: counts }),
        source: sourceView(source),
      })),
    };
  }

  async remove(owner: User, slug: string): Promise<void> {
    const { c } = await this.find(owner, slug);
    await this.db.delete(compilation).where(eq(compilation.id, c.id));
  }

  /** Adds a layer: verses within `scope` come from `source` (domain-model §2.3, CompilationRule). */
  async addRule(
    owner: User,
    slug: string,
    input: { scope: RuleScope; source: string },
  ): Promise<CompilationView> {
    const { c, base } = await this.find(owner, slug);
    const [source] = await this.db
      .select()
      .from(translation)
      .where(eq(translation.catalogId, input.source));
    if (!source) throw new BadRequestException({ code: "unknown-translation" });
    if (!canCompile(source.licenseKey))
      throw new BadRequestException({ code: "source-not-allowed" });

    let kind: RuleKind;
    let scope: OrdinalRange;
    let entered: string;
    if ("section" in input.scope) {
      kind = "section";
      scope = sectionRange(input.scope.section);
      entered = input.scope.section;
    } else {
      const counts = await this.translations.verseCounts(base.id);
      const parsed = parseReference(input.scope.reference, {
        scheme: c.scheme as SchemeId,
        verses: counts,
      });
      if (!parsed.ok)
        throw new BadRequestException({ code: parsed.error.code, index: parsed.error.index });
      const [ref, ...more] = parsed.references;
      if (!ref || more.length > 0) throw new BadRequestException({ code: "one-reference" });
      if (ref.entered.start.part !== 0 || ref.entered.end.part !== 0)
        throw new BadRequestException({ code: "whole-verses" });
      if (!ref.canonical) throw new BadRequestException({ code: "no-canonical" });
      kind = kindOf(ref.entered, counts);
      // A single verse is a verse choice (slice 2), not a layer.
      if (
        kind === "range" &&
        ref.entered.start.chapter === ref.entered.end.chapter &&
        ref.entered.start.verse === ref.entered.end.verse
      )
        throw new BadRequestException({ code: "single-verse" });
      scope = toOrdinalRange(ref.canonical);
      entered = formatOsisPassage(ref.entered);
    }

    // The verse list comes from the base for now, so a scope must hold some of its verses.
    const [inBase] = await this.db
      .select({ id: verseText.id })
      .from(verseText)
      .where(
        and(
          eq(verseText.translationId, base.id),
          sql`${verseText.canonicalRange} && int4range(${scope.start}, ${scope.end}, '[]')`,
        ),
      )
      .limit(1);
    if (!inBase) throw new BadRequestException({ code: "not-in-base" });

    await this.db.transaction(async (tx) => {
      const [overlap] = await tx
        .select({ id: compilationRule.id })
        .from(compilationRule)
        .where(
          and(
            eq(compilationRule.compilationId, c.id),
            eq(compilationRule.kind, kind),
            sql`${compilationRule.scope} && int4range(${scope.start}, ${scope.end}, '[]')`,
          ),
        )
        .for("update");
      if (overlap) throw new ConflictException({ code: "rule-overlaps" });
      await tx.insert(compilationRule).values({
        compilationId: c.id,
        kind,
        scope,
        entered,
        sourceTranslationId: source.id,
      });
      await tx.update(compilation).set({ updatedAt: new Date() }).where(eq(compilation.id, c.id));
    });
    return this.view(owner, slug);
  }

  /**
   * Gives a whole book a new base: the book comes from `source`, and every narrower choice within
   * it (its book, chapter and passage rules, and its single verses, edits and own renderings
   * included) is thrown away, as each would be removed on its own. A section rule stays.
   */
  replaceBook(owner: User, slug: string, osis: string, sourceId: string): Promise<CompilationView> {
    return this.replaceScope(owner, slug, osis, sourceId, "book");
  }

  /**
   * Gives one chapter (`Gen.1`) a new source, as `replaceBook` does a book: its chapter and
   * passage rules and its single verses go. A passage running past the chapter keeps its verses
   * outside it. Book and section rules stay, below the chapter's.
   */
  replaceChapter(
    owner: User,
    slug: string,
    osis: string,
    sourceId: string,
  ): Promise<CompilationView> {
    return this.replaceScope(owner, slug, osis, sourceId, "chapter");
  }

  private async replaceScope(
    owner: User,
    slug: string,
    osis: string,
    sourceId: string,
    kind: "book" | "chapter",
  ): Promise<CompilationView> {
    const { c, base } = await this.find(owner, slug);
    const [source] = await this.db
      .select()
      .from(translation)
      .where(eq(translation.catalogId, sourceId));
    if (!source) throw new BadRequestException({ code: "unknown-translation" });
    if (!canCompile(source.licenseKey))
      throw new BadRequestException({ code: "source-not-allowed" });
    const counts = await this.translations.verseCounts(base.id);
    const canonical = (text: string) => {
      const parsed = parseReference(text, { scheme: c.scheme as SchemeId, verses: counts });
      return parsed.ok && parsed.references.length === 1 ? parsed.references[0] : undefined;
    };
    const ref = canonical(osis);
    if (
      !ref?.canonical ||
      ref.entered.start.book !== osis.split(".")[0] ||
      kindOf(ref.entered, counts) !== kind
    )
      throw new BadRequestException({ code: "not-in-base" });
    const scope = toOrdinalRange(ref.canonical);
    const within = (column: typeof compilationRule.scope | typeof compilationVerse.scope) =>
      sql`${column} && int4range(${scope.start}, ${scope.end}, '[]')`;
    const narrower: RuleKind[] =
      kind === "book" ? ["book", "chapter", "range"] : ["chapter", "range"];

    await this.db.transaction(async (tx) => {
      const removedRules = await tx
        .delete(compilationRule)
        .where(
          and(
            eq(compilationRule.compilationId, c.id),
            inArray(compilationRule.kind, narrower),
            within(compilationRule.scope),
          ),
        )
        .returning();
      // A passage running past the chapter keeps the verses outside it, still a passage.
      if (kind === "chapter") {
        for (const r of removedRules) {
          if (r.kind !== "range") continue;
          for (const rest of outsideChapter(parseOsisPassage(r.entered), ref.entered, counts)) {
            // In the form the reference parser reads (`Joel.3.1-3.2`): one book, chapters and verses.
            const { start, end } = rest;
            const restRef = canonical(
              `${start.book}.${start.chapter}.${start.verse}-${end.chapter}.${end.verse}`,
            );
            if (!restRef?.canonical) continue;
            await tx.insert(compilationRule).values({
              compilationId: c.id,
              kind: "range",
              scope: toOrdinalRange(restRef.canonical),
              entered: formatOsisPassage(restRef.entered),
              sourceTranslationId: r.sourceTranslationId,
            });
          }
        }
      }
      const removed = await tx
        .delete(compilationVerse)
        .where(and(eq(compilationVerse.compilationId, c.id), within(compilationVerse.scope)))
        .returning({ entered: compilationVerse.entered });
      for (const { entered } of removed) {
        await tx
          .insert(compilationVerseRevision)
          .values({ compilationId: c.id, entered, authorId: owner.id });
        await this.authorship.clear(tx, c.id, entered);
      }
      await tx.insert(compilationRule).values({
        compilationId: c.id,
        kind,
        scope,
        entered: formatOsisPassage(ref.entered),
        sourceTranslationId: source.id,
      });
      await tx.update(compilation).set({ updatedAt: new Date() }).where(eq(compilation.id, c.id));
    });
    return this.view(owner, slug);
  }

  /** Removes a layer: its verses are inherited again ("reset to inherited"). */
  async removeRule(owner: User, slug: string, ruleId: string): Promise<CompilationView> {
    const { c } = await this.find(owner, slug);
    const removed = await this.db
      .delete(compilationRule)
      .where(and(eq(compilationRule.id, ruleId), eq(compilationRule.compilationId, c.id)))
      .returning({ id: compilationRule.id });
    if (removed.length === 0) throw new NotFoundException({ code: "unknown-rule" });
    return this.view(owner, slug);
  }

  async books(owner: User, slug: string): Promise<TranslationBookSummary[]> {
    const { base } = await this.find(owner, slug);
    return (await this.translations.books(base.catalogId)) ?? [];
  }

  /** A passage of the compilation, in its numbering, each verse resolved through the layers. */
  async passage(
    owner: User,
    slug: string,
    reference: string,
  ): Promise<{
    translation: TranslationSummary;
    passages: (PassageResult & { verses: CompilationVerse[] })[];
    sources: SourceView[];
  }> {
    const { c, base } = await this.find(owner, slug);
    const counts = await this.translations.verseCounts(base.id);
    const parsed = parseReference(reference, { scheme: c.scheme as SchemeId, verses: counts });
    if (!parsed.ok)
      throw new BadRequestException({ code: parsed.error.code, index: parsed.error.index });

    const rules = await this.db
      .select()
      .from(compilationRule)
      .where(eq(compilationRule.compilationId, c.id));
    const layers: Layer[] = rules.map((r) => ({
      id: r.id,
      kind: r.kind,
      scope: r.scope,
      sourceId: r.sourceTranslationId,
    }));
    const choices = await this.db
      .select()
      .from(compilationVerse)
      .where(eq(compilationVerse.compilationId, c.id));
    const sourceIds = new Set([
      ...rules.map((r) => r.sourceTranslationId),
      ...choices.flatMap((v) => (v.sourceTranslationId ? [v.sourceTranslationId] : [])),
    ]);
    const sourceRows = sourceIds.size
      ? await this.db
          .select()
          .from(translation)
          .where(inArray(translation.id, [...sourceIds]))
      : [];
    const sources = new Map([base, ...sourceRows].map((t) => [t.id, t]));
    const used = new Map<string, SourceView>();

    const passages: (PassageResult & { verses: CompilationVerse[] })[] = [];
    let total = 0;
    for (const ref of parsed.references) {
      const baseVerses = await this.translations.versesIn(base.id, ref.entered);
      total += baseVerses.length;
      if (total > MAX_VERSES)
        throw new BadRequestException({ code: "too-many-verses", limit: MAX_VERSES });
      const verses = await this.resolve(
        baseVerses,
        ref.entered.start.book,
        base.id,
        layers,
        new Map(choices.map((v) => [v.entered, v])),
        await this.notesOf(choices.map((v) => v.id)),
      );
      for (const v of verses) {
        const t = v.from ? sources.get(v.from) : undefined;
        if (t && !used.has(t.id)) used.set(t.id, sourceView(t));
      }
      passages.push({
        entered: formatOsisPassage(ref.entered),
        canonical: ref.canonical ? formatOsisPassage(ref.canonical) : null,
        label: formatPassage(ref.entered, { verses: counts }),
        wholeChapters: wholeChapters(ref.entered, counts),
        verses: verses.map(({ verse, from, edit, rendering }) => ({
          ...verse,
          ...(rendering
            ? { rendering }
            : { source: sources.get(from ?? "")?.catalogId ?? base.catalogId }),
          ...(edit ? { edit } : {}),
        })),
      });
    }
    return {
      translation: {
        id: `@${owner.handle}/${c.slug}`,
        abbreviation: c.abbreviation,
        name: c.title,
        language: base.language,
        direction: base.direction,
        scheme: c.scheme,
        license: "compilation",
      },
      passages,
      sources: [...used.values()],
    };
  }

  /**
   * Each base verse as the compilation has it (domain-model §2.3, "Resolution order"): its
   * single-verse choice, else the same verse from the most specific layer whose source has it,
   * else the base's.
   */
  private async resolve(
    baseVerses: readonly StoredVerse[],
    book: string,
    baseId: string,
    layers: readonly Layer[],
    choices: ReadonlyMap<string, ChoiceRow>,
    notes: ReadonlyMap<string, NoteRow[]>,
  ): Promise<
    { verse: PassageVerse; from: string | null; edit?: EditKind; rendering?: Rendering }[]
  > {
    const ranges = baseVerses.flatMap((v) => (v.range ? [v.range] : []));
    const span = ranges.length
      ? {
          start: Math.min(...ranges.map((r) => r.start)),
          end: Math.max(...ranges.map((r) => r.end)),
        }
      : undefined;
    const relevant = span
      ? layers.filter((l) => l.scope.start <= span.end && span.start <= l.scope.end)
      : [];
    const chosen = baseVerses.flatMap((b) => {
      const choice = choices.get(`${book}.${b.chapter}.${b.verse}`);
      return choice?.origin === "source" && choice.sourceTranslationId
        ? [choice.sourceTranslationId]
        : [];
    });
    const fromSource = new Map<string, StoredVerse[]>();
    // A whole book (a publication snapshot) can need more than a reader's request allows.
    const limit = Math.max(MAX_VERSES, baseVerses.length) * 2;
    for (const id of new Set([...relevant.map((l) => l.sourceId), ...chosen])) {
      if (span) fromSource.set(id, await this.translations.versesOverlapping(id, span, limit));
    }
    return baseVerses.map((b) => {
      const { range: _, ...baseVerse } = b;
      // The compilation's numbering, the source's words.
      const numbered = (v: StoredVerse) => {
        const { range: __, ...rest } = v;
        return { ...rest, chapter: b.chapter, verse: b.verse, to: b.to, published: b.published };
      };
      const choice = choices.get(`${book}.${b.chapter}.${b.verse}`);
      // The user's own wording keeps the base verse's headings and paragraph, not its notes.
      if ((choice?.origin === "own" || choice?.origin === "pasted") && choice.content)
        return {
          verse: {
            ...baseVerse,
            ...compiledNotes(choice.content as Inline[], [], notes.get(choice.id) ?? []),
          },
          from: null,
          rendering: choice.origin,
        };
      if (choice?.sourceTranslationId) {
        if (choice.origin === "edited" && choice.editKind) {
          const snapshot = choice.sourceSnapshot as Snapshot;
          return {
            verse: {
              ...baseVerse,
              headings: snapshot.headings,
              ...compiledNotes(
                choice.content as Inline[],
                snapshot.notes,
                notes.get(choice.id) ?? [],
              ),
            },
            from: choice.sourceTranslationId,
            edit: choice.editKind,
          };
        }
        const found = matchingVerse(b, fromSource.get(choice.sourceTranslationId) ?? []);
        if (found) return { verse: numbered(found), from: choice.sourceTranslationId };
      }
      for (const layer of layersFor(b, relevant)) {
        const found = matchingVerse(b, fromSource.get(layer.sourceId) ?? []);
        if (found) return { verse: numbered(found), from: layer.sourceId };
      }
      return { verse: baseVerse, from: baseId };
    });
  }

  /**
   * The whole compilation as a publication takes it (domain-model §2.3, `PublicationVersion`):
   * every book of its base, each verse resolved through the layers as the reader has it, with
   * the translations it draws on and the verses still pasted.
   */
  /** Its composition by source; reads every verse, so it's asked for separately from the view. */
  async composition(owner: User, slug: string): Promise<CompositionView> {
    const s = await this.snapshot(owner, slug);
    const verses = s.sources.reduce((n, x) => n + x.verses, 0) + s.own;
    const share = (n: number) => (verses ? Math.round((1000 * n) / verses) / 10 : 0);
    return {
      verses,
      sources: s.sources
        .map(({ translation: t, verses: n }) => ({
          id: t.catalogId,
          abbreviation: t.abbreviation,
          name: t.name,
          verses: n,
          share: share(n),
        }))
        .sort((a, b) => b.verses - a.verses),
      own: { verses: s.own, share: share(s.own) },
    };
  }

  /** `books`: only these (OSIS IDs), as a PDF build of part of the compilation takes it. */
  async snapshot(
    owner: User,
    slug: string,
    books?: ReadonlySet<string>,
  ): Promise<CompilationSnapshot> {
    const { c, base } = await this.find(owner, slug);
    const layers = await this.layers(c.id);
    const choices = await this.db
      .select()
      .from(compilationVerse)
      .where(eq(compilationVerse.compilationId, c.id));
    const notes = await this.notesOf(choices.map((v) => v.id));
    const byEntered = new Map(choices.map((v) => [v.entered, v]));
    const sourceIds = new Set([
      ...layers.map((l) => l.sourceId),
      ...choices.flatMap((v) => (v.sourceTranslationId ? [v.sourceTranslationId] : [])),
    ]);
    const rows = sourceIds.size
      ? await this.db
          .select()
          .from(translation)
          .where(inArray(translation.id, [...sourceIds]))
      : [];
    const translations = new Map([base, ...rows].map((t) => [t.id, t]));
    const used = new Map<string, number>();
    let own = 0;
    let corrected = 0;
    let adapted = 0;

    const resolvedBooks: SnapshotBook[] = [];
    for (const b of (await this.translations.books(base.catalogId)) ?? []) {
      if (books && !books.has(b.osis)) continue;
      const resolved = await this.resolve(
        await this.translations.bookVerses(base.id, b.osis),
        b.osis,
        base.id,
        layers,
        byEntered,
        notes,
      );
      const chapters = new Map<number, CompilationVerse[]>();
      for (const { verse, from, edit, rendering } of resolved) {
        if (rendering) own++;
        else used.set(from ?? base.id, (used.get(from ?? base.id) ?? 0) + 1);
        if (edit === "correction") corrected++;
        if (edit === "adaptation") adapted++;
        const list = chapters.get(verse.chapter) ?? [];
        list.push({
          ...verse,
          ...(rendering
            ? { rendering }
            : { source: translations.get(from ?? "")?.catalogId ?? base.catalogId }),
          ...(edit ? { edit } : {}),
        });
        chapters.set(verse.chapter, list);
      }
      resolvedBooks.push({
        osis: b.osis,
        chapters: [...chapters].map(([chapter, verses]) => ({ chapter, verses })),
      });
    }
    const counts = await this.translations.verseCounts(base.id);
    return {
      compilation: c,
      base,
      books: resolvedBooks,
      sources: [...used].flatMap(([id, verses]) => {
        const t = translations.get(id);
        return t ? [{ translation: t, verses }] : [];
      }),
      own,
      corrected,
      adapted,
      pasted: choices
        .filter((v) => v.origin === "pasted")
        .map((v) => formatPassage(parseOsisPassage(v.entered), { verses: counts })),
    };
  }

  /** The base verse a reference names: exactly one verse, in the compilation's numbering. */
  private async oneVerse(
    c: typeof compilation.$inferSelect,
    base: typeof translation.$inferSelect,
    reference: string,
  ): Promise<{ verse: StoredVerse; entered: string; label: string; book: string }> {
    const counts = await this.translations.verseCounts(base.id);
    const parsed = parseReference(reference, { scheme: c.scheme as SchemeId, verses: counts });
    if (!parsed.ok)
      throw new BadRequestException({ code: parsed.error.code, index: parsed.error.index });
    const [ref, ...more] = parsed.references;
    if (!ref || more.length > 0) throw new BadRequestException({ code: "one-verse" });
    if (ref.entered.start.part !== 0 || ref.entered.end.part !== 0)
      throw new BadRequestException({ code: "whole-verses" });
    const found = await this.translations.versesIn(base.id, ref.entered);
    const [verse, ...others] = found;
    if (!verse || others.length > 0) throw new BadRequestException({ code: "one-verse" });
    if (!verse.range) throw new BadRequestException({ code: "no-canonical" });
    const book = ref.entered.start.book;
    const at = { book, chapter: verse.chapter, verse: verse.verse, part: 0 };
    const end = { ...at, verse: verse.to ?? verse.verse };
    return {
      verse,
      book,
      entered: `${book}.${verse.chapter}.${verse.verse}`,
      label: formatPassage({ start: at, end }, { verses: counts }),
    };
  }

  /** The verse editor (vision §3.1): the verse as the compilation has it, and each translation's. */
  async verse(owner: User, slug: string, reference: string): Promise<VerseEditorView> {
    const { c, base } = await this.find(owner, slug);
    const { verse, entered, label, book } = await this.oneVerse(c, base, reference);
    const rules = await this.db
      .select()
      .from(compilationRule)
      .where(eq(compilationRule.compilationId, c.id));
    const [choice] = await this.db
      .select()
      .from(compilationVerse)
      .where(and(eq(compilationVerse.compilationId, c.id), eq(compilationVerse.entered, entered)));
    const [resolved] = await this.resolve(
      [verse],
      book,
      base.id,
      rules.map((r) => ({
        id: r.id,
        kind: r.kind,
        scope: r.scope,
        sourceId: r.sourceTranslationId,
      })),
      new Map(choice ? [[entered, choice]] : []),
      await this.notesOf(choice ? [choice.id] : []),
    );
    if (!resolved) throw new NotFoundException({ code: "one-verse" });

    const candidates = await this.candidates(verse);
    const options = candidates
      .filter((o) => o.shown)
      .map(({ translation: t, text }) => ({
        translation: sourceView(t),
        text,
        modifiable: canModify(t.licenseKey),
        correctionLimit: correctionLimit(t.licenseKey),
      }));

    const from = resolved.from
      ? (candidates.find((o) => o.translation.id === resolved.from)?.translation ??
        (await this.db.select().from(translation).where(eq(translation.id, resolved.from)))[0])
      : undefined;
    const counts = await this.translations.verseCounts(base.id);
    const text = editableText(resolved.verse.content as Inline[]);
    const view = choice ? ((await this.choiceViews(c.id, counts, choice.id))[0] ?? null) : null;
    return {
      label,
      entered,
      current: {
        origin: view?.origin ?? "source",
        source: resolved.rendering ? null : sourceView(from ?? base),
        edit: resolved.edit ?? null,
        text,
      },
      choice: view,
      authorship: resolved.rendering ? await this.authorship.summary(c.id, entered, text) : null,
      statement: AUTHORSHIP_STATEMENT,
      // Taken unchanged, its translation's notes, if its license lets them be changed.
      notes:
        choice && choice.origin !== "source"
          ? await this.noteViews(choice)
          : from && canModify(from.licenseKey)
            ? noteEditViews(resolved.verse.notes, [])
            : null,
      words: wordsIn(text),
      options,
    };
  }

  /**
   * Every translation's wording of the same verse (same canonical verses), in abbreviation order.
   * `shown` marks those the editor offers: their licenses let them be compiled.
   */
  private async candidates(verse: StoredVerse): Promise<Candidate[]> {
    const range = verse.range as OrdinalRange;
    const rows = await this.db
      .select({ t: translation, v: verseText })
      .from(verseText)
      .innerJoin(translation, eq(translation.id, verseText.translationId))
      .where(sql`${verseText.canonicalRange} && int4range(${range.start}, ${range.end}, '[]')`);
    const byTranslation = new Map<
      string,
      { t: typeof translation.$inferSelect; verses: StoredVerse[] }
    >();
    for (const { t, v } of rows) {
      const entry = byTranslation.get(t.id) ?? { t, verses: [] };
      entry.verses.push({
        chapter: v.chapter,
        verse: v.verse,
        to: v.toVerse,
        published: v.published,
        canonical: v.canonical,
        range: v.canonicalRange,
        headings: v.headings,
        content: v.content,
        notes: [],
      });
      byTranslation.set(t.id, entry);
    }
    return [...byTranslation.values()]
      .flatMap(({ t, verses }) => {
        const match = matchingVerse(verse, verses);
        return match
          ? [
              {
                translation: t,
                text: editableText(match.content as Inline[]),
                shown: canCompile(t.licenseKey),
              },
            ]
          : [];
      })
      .sort((a, b) => a.translation.abbreviation.localeCompare(b.translation.abbreviation));
  }

  /** The base verse a choice or journal names by its OSIS `entered`. */
  private async enteredVerse(baseId: string, entered: string): Promise<StoredVerse> {
    const [verse] = await this.translations.versesIn(baseId, parseOsisPassage(entered));
    if (!verse?.range) throw new NotFoundException({ code: "one-verse" });
    return verse;
  }

  /**
   * Starts writing the user's own rendering of a verse (domain-model §2.3.1): a new journal,
   * from the compilation's own wording if it already has one, else from nothing.
   */
  async startJournal(
    owner: User,
    slug: string,
    reference: string,
  ): Promise<{ id: string; text: string }> {
    const { c, base } = await this.find(owner, slug);
    const { verse, entered } = await this.oneVerse(c, base, reference);
    const [choice] = await this.db
      .select()
      .from(compilationVerse)
      .where(and(eq(compilationVerse.compilationId, c.id), eq(compilationVerse.entered, entered)));
    const start =
      (choice?.origin === "own" || choice?.origin === "pasted") && choice.content
        ? editableText(choice.content as Inline[])
        : "";
    const shown = (await this.candidates(verse)).filter((o) => o.shown);
    return this.authorship.start(owner, c.id, entered, start, shown);
  }

  /** Adds the editor's composition events to a journal. */
  async recordEvents(
    owner: User,
    slug: string,
    journalId: string,
    events: readonly EventInput[],
  ): Promise<{ events: number; length: number }> {
    const { c, base } = await this.find(owner, slug);
    return this.authorship.record(owner, c.id, journalId, events, async (entered) =>
      this.candidates(await this.enteredVerse(base.id, entered)),
    );
  }

  /** Declares a pasted rendering the user's own (domain-model §2.3, `pasted` → `own`). */
  async declareVerse(
    owner: User,
    slug: string,
    id: string,
    statement: number,
  ): Promise<VerseChoiceView> {
    const { c, base } = await this.find(owner, slug);
    await this.db.transaction(async (tx) => {
      const [choice] = await tx
        .select()
        .from(compilationVerse)
        .where(and(eq(compilationVerse.id, id), eq(compilationVerse.compilationId, c.id)))
        .for("update");
      if (!choice) throw new NotFoundException({ code: "unknown-verse-choice" });
      if (choice.origin !== "pasted") throw new BadRequestException({ code: "not-pasted" });
      const text = editableText(choice.content as Inline[]);
      await this.authorship.declare(tx, owner, c.id, choice.entered, text, statement);
      await tx
        .update(compilationVerse)
        .set({ origin: "own", updatedAt: new Date() })
        .where(eq(compilationVerse.id, choice.id));
      await tx.insert(compilationVerseRevision).values({
        compilationId: c.id,
        entered: choice.entered,
        authorId: owner.id,
        origin: "own",
        content: choice.content,
        changeNote: choice.changeNote,
        notes: revisionNotes(
          await tx
            .select()
            .from(compilationNote)
            .where(eq(compilationNote.compilationVerseId, choice.id)),
        ),
      });
    });
    const counts = await this.translations.verseCounts(base.id);
    const [view] = await this.choiceViews(c.id, counts, id);
    if (!view) throw new Error("no verse choice");
    return view;
  }

  /** The evidence bundle for one of the user's own renderings (domain-model §2.3.1). */
  async evidence(owner: User, slug: string, id: string) {
    const { c, base } = await this.find(owner, slug);
    const [choice] = await this.db
      .select()
      .from(compilationVerse)
      .where(and(eq(compilationVerse.id, id), eq(compilationVerse.compilationId, c.id)));
    if (!choice || (choice.origin !== "own" && choice.origin !== "pasted") || !choice.content)
      throw new NotFoundException({ code: "unknown-verse-choice" });
    const counts = await this.translations.verseCounts(base.id);
    const text = editableText(choice.content as Inline[]);
    return {
      format: "scripturetips-authorship-evidence",
      version: 1,
      exportedAt: new Date().toISOString(),
      signed: false,
      author: `@${owner.handle}`,
      compilation: { id: `@${owner.handle}/${c.slug}`, title: c.title },
      verse: {
        entered: choice.entered,
        label: formatPassage(parseOsisPassage(choice.entered), { verses: counts }),
        origin: choice.origin,
        text,
        textHash: textHash(text),
      },
      ...(await this.authorship.evidence(c.id, choice.entered)),
      // The user's translator's notes explaining their choices (vision §6.1).
      notes: noteEditViews([], (await this.notesOf([choice.id])).get(choice.id) ?? []).map(
        ({ text, after }) => ({ text, after }),
      ),
    };
  }

  /** The note rows of these verse choices, by choice. */
  private async notesOf(ids: readonly string[]): Promise<Map<string, NoteRow[]>> {
    const rows = ids.length
      ? await this.db
          .select()
          .from(compilationNote)
          .where(inArray(compilationNote.compilationVerseId, [...ids]))
          .orderBy(asc(compilationNote.position))
      : [];
    const byChoice = new Map<string, NoteRow[]>();
    for (const r of rows)
      byChoice.set(r.compilationVerseId, [...(byChoice.get(r.compilationVerseId) ?? []), r]);
    return byChoice;
  }

  /** An edited or own verse's notes for the editor. */
  private async noteViews(choice: ChoiceRow): Promise<NoteEditView[]> {
    const rows = (await this.notesOf([choice.id])).get(choice.id) ?? [];
    return noteEditViews(sourceNotes(choice), rows);
  }

  /**
   * Changes one of a verse's translator's notes (domain-model §2.3): `text` rewords it (a source
   * note becomes `modified`, or `original` again when reworded as it was), `removed` leaves a
   * source note out or deletes an own note, and `restore` brings back the source's note. A note
   * belongs to its verse, so changing one on a verse taken unchanged makes it an edited verse of
   * its translation (its words unchanged), if the translation's license allows changes.
   */
  async changeNote(
    owner: User,
    slug: string,
    reference: string,
    change: NoteChange,
  ): Promise<NoteEditView[]> {
    const { c, base } = await this.find(owner, slug);
    const { verse, entered, book } = await this.oneVerse(c, base, reference);
    const [choice] = await this.db
      .select()
      .from(compilationVerse)
      .where(and(eq(compilationVerse.compilationId, c.id), eq(compilationVerse.entered, entered)));
    if (choice && choice.origin !== "source")
      return this.db.transaction(async (tx) => {
        const [locked] = await tx
          .select()
          .from(compilationVerse)
          .where(eq(compilationVerse.id, choice.id))
          .for("update");
        if (!locked) throw new NotFoundException({ code: "unknown-verse-choice" });
        return this.applyNote(tx, owner, c, locked, change);
      });

    const [resolved] = await this.resolve(
      [verse],
      book,
      base.id,
      await this.layers(c.id),
      new Map(choice ? [[entered, choice]] : []),
      new Map(),
    );
    const [source] = await this.db
      .select()
      .from(translation)
      .where(eq(translation.id, resolved?.from ?? base.id));
    if (!resolved || !source) throw new NotFoundException({ code: "one-verse" });
    if (!canModify(source.licenseKey))
      throw new BadRequestException({ code: "modification-not-allowed" });
    const { row } = await this.editOf(verse, source, {
      text: editableText(resolved.verse.content as Inline[]),
      edited: true,
    });
    let notes: NoteEditView[] = [];
    await this.store(owner, { c, base, verse, entered }, row, async (tx, saved) => {
      notes = await this.applyNote(tx, owner, c, saved, change);
    });
    return notes;
  }

  /** The compilation's rules as resolution layers. */
  private async layers(compilationId: string): Promise<Layer[]> {
    const rules = await this.db
      .select()
      .from(compilationRule)
      .where(eq(compilationRule.compilationId, compilationId));
    return rules.map((r) => ({
      id: r.id,
      kind: r.kind,
      scope: r.scope,
      sourceId: r.sourceTranslationId,
    }));
  }

  /** Makes one change to an edited or own verse's notes, in `tx`, with a revision. */
  private async applyNote(
    tx: Transaction,
    owner: User,
    c: typeof compilation.$inferSelect,
    choice: ChoiceRow,
    change: NoteChange,
  ): Promise<NoteEditView[]> {
    const source = sourceNotes(choice);
    const rows = await tx
      .select()
      .from(compilationNote)
      .where(eq(compilationNote.compilationVerseId, choice.id));
    const words = wordCount(editableText(choice.content as Inline[]));
    const anchor = (after: number) => {
      if (after > words) throw new BadRequestException({ code: "note-anchor" });
      return after;
    };
    const reworded = (text: string) => {
      const t = editableText([text]);
      if (!t) throw new BadRequestException({ code: "empty-note" });
      return t;
    };

    if ("add" in change) {
      if (rows.filter((r) => r.origin === "own").length >= MAX_OWN_NOTES)
        throw new BadRequestException({ code: "too-many-notes", limit: MAX_OWN_NOTES });
      await tx.insert(compilationNote).values({
        compilationVerseId: choice.id,
        position: nextPosition(source, rows),
        origin: "own",
        body: [reworded(change.add.text)],
        after: anchor(change.add.after),
      });
    } else {
      const row = rows.find((r) => r.position === change.position);
      const original = source.find((n) => n.position === change.position);
      if (row?.origin === "own") {
        if (change.removed) await tx.delete(compilationNote).where(eq(compilationNote.id, row.id));
        else
          await tx
            .update(compilationNote)
            .set({
              ...(change.text !== undefined ? { body: [reworded(change.text)] } : {}),
              ...(change.after !== undefined ? { after: anchor(change.after) } : {}),
              updatedAt: new Date(),
            })
            .where(eq(compilationNote.id, row.id));
      } else if (original) {
        const body = original.body as Inline[];
        const kept = row?.origin === "modified" ? (row.body as Inline[]) : body;
        const next = change.restore
          ? null
          : change.removed
            ? { origin: "original" as const, removed: true, body: null }
            : change.text !== undefined
              ? editableText([change.text]) === noteText(body)
                ? null
                : {
                    origin: "modified" as const,
                    removed: false,
                    body: rewordNote(kept, reworded(change.text)),
                  }
              : undefined;
        if (next === null) {
          if (row) await tx.delete(compilationNote).where(eq(compilationNote.id, row.id));
        } else if (next)
          await tx
            .insert(compilationNote)
            .values({
              compilationVerseId: choice.id,
              position: original.position,
              sourceNote: original,
              ...next,
            })
            .onConflictDoUpdate({
              target: [compilationNote.compilationVerseId, compilationNote.position],
              set: { ...next, updatedAt: new Date() },
            });
      } else throw new NotFoundException({ code: "unknown-note" });
    }

    const now = await tx
      .select()
      .from(compilationNote)
      .where(eq(compilationNote.compilationVerseId, choice.id))
      .orderBy(asc(compilationNote.position));
    await tx.insert(compilationVerseRevision).values({
      compilationId: c.id,
      entered: choice.entered,
      authorId: owner.id,
      origin: choice.origin,
      editKind: choice.editKind,
      sourceTranslationId: choice.sourceTranslationId,
      content: choice.content,
      changeNote: choice.changeNote,
      notes: revisionNotes(now),
    });
    await tx.update(compilation).set({ updatedAt: new Date() }).where(eq(compilation.id, c.id));
    return noteEditViews(source, now);
  }

  /**
   * Chooses a single verse from `source`, or saves an edit of that source's wording
   * (domain-model §2.3): within the license's correction limit an edit is a correction unless
   * the user calls it an adaptation; beyond it, it's an adaptation. With `journal`, saves the
   * user's own rendering instead (`saveRendering`).
   */
  async saveVerse(
    owner: User,
    slug: string,
    input: {
      reference: string;
      source?: string | undefined;
      text?: string | undefined;
      kind?: EditKind | undefined;
      changeNote?: string | undefined;
      journal?: string | undefined;
      declaration?: number | undefined;
    },
  ): Promise<{ choice: VerseChoiceView; changes: number; pastedFrom?: SourceView }> {
    const { c, base } = await this.find(owner, slug);
    const { verse, entered } = await this.oneVerse(c, base, input.reference);
    const at = { c, base, verse, entered };
    if (input.journal) return this.saveRendering(owner, at, input.journal, input);
    const [source] = input.source
      ? await this.db.select().from(translation).where(eq(translation.catalogId, input.source))
      : [];
    if (!source) throw new BadRequestException({ code: "unknown-translation" });
    if (!canCompile(source.licenseKey))
      throw new BadRequestException({ code: "source-not-allowed" });
    const { row, changed } = await this.editOf(verse, source, input);
    // Choosing a translation's wording ends any own rendering, and its evidence with it.
    const choice = await this.store(owner, at, row, (tx) =>
      this.authorship.clear(tx, c.id, entered),
    );
    return { choice, changes: changed };
  }

  /**
   * Saves the wording a journal recorded (domain-model §2.3, vision §6.1). If it pasted words
   * from a translation the editor shows, it's an edit of that translation (the one it now
   * follows most closely). Otherwise it's the user's `own` once they declare it; undeclared, it
   * can be saved only if it pasted text from outside, as `pasted`. Its similarity to every
   * translation is recorded.
   */
  private async saveRendering(
    owner: User,
    at: VerseAt,
    journalId: string,
    input: {
      kind?: EditKind | undefined;
      changeNote?: string | undefined;
      declaration?: number | undefined;
    },
  ): Promise<{ choice: VerseChoiceView; changes: number; pastedFrom?: SourceView }> {
    const { c, verse, entered } = at;
    const j = await this.authorship.open(owner, c.id, journalId);
    if (j.entered !== entered) throw new BadRequestException({ code: "journal-other-verse" });
    const text = editableText([j.text]);
    if (!text) throw new BadRequestException({ code: "empty-rendering" });
    const candidates = await this.candidates(verse);
    const pastes = await this.authorship.pastes(j.id);

    const [closest] = candidates
      .filter((o) => o.shown && pastes.internal.has(o.translation.id))
      .map((o) => ({ o, score: similarity(text, o.text).score }))
      .sort((a, b) => b.score - a.score);
    if (closest) {
      const source = closest.o.translation;
      const { row, changed } = await this.editOf(verse, source, { ...input, text });
      const choice = await this.store(owner, at, row, async (tx) => {
        await this.authorship.complete(tx, j.id);
        await this.authorship.clearClaims(tx, c.id, entered);
      });
      return { choice, changes: changed, pastedFrom: sourceView(source) };
    }

    const declared = input.declaration !== undefined;
    if (!declared && !pastes.external)
      throw new BadRequestException({ code: "declaration-required" });
    const row: VerseRow = {
      origin: declared ? "own" : "pasted",
      editKind: null,
      sourceTranslationId: null,
      sourceSnapshot: null,
      sourceHash: null,
      sourceImportId: null,
      content: ownContent(verse, text),
      changeNote: input.changeNote?.trim() || null,
      wordCount: wordCount(text),
    };
    const choice = await this.store(owner, at, row, async (tx) => {
      await this.authorship.complete(tx, j.id);
      await this.authorship.compare(tx, c.id, entered, text, candidates);
      if (input.declaration !== undefined)
        await this.authorship.declare(tx, owner, c.id, entered, text, input.declaration);
    });
    return { choice, changes: 0 };
  }

  /** The row for `source`'s verse, or for `text` as an edit of it; and how much changed. */
  private async editOf(
    verse: StoredVerse,
    source: typeof translation.$inferSelect,
    input: {
      text?: string | undefined;
      kind?: EditKind | undefined;
      changeNote?: string | undefined;
      /** An edit even with the words unchanged: its notes are being changed. */
      edited?: true | undefined;
    },
  ): Promise<{ row: VerseRow; changed: number }> {
    const found = matchingVerse(
      verse,
      await this.translations.versesOverlapping(source.id, verse.range as OrdinalRange),
    );
    if (!found) throw new BadRequestException({ code: "not-in-source" });
    const snapshot = snapshotOf(found);
    const before = editableText(snapshot.content);
    if (input.text === undefined || (!input.edited && editableText([input.text]) === before))
      return {
        changed: 0,
        row: {
          origin: "source",
          editKind: null,
          sourceTranslationId: source.id,
          sourceSnapshot: null,
          sourceHash: null,
          sourceImportId: null,
          content: null,
          changeNote: null,
          wordCount: null,
        },
      };
    if (!canModify(source.licenseKey))
      throw new BadRequestException({ code: "modification-not-allowed" });
    const changed = changes(before, input.text);
    const [latest] = await this.db
      .select({ id: translationImport.id })
      .from(translationImport)
      .where(eq(translationImport.translationId, source.id))
      .orderBy(desc(translationImport.importedAt))
      .limit(1);
    return {
      changed,
      row: {
        origin: "edited",
        editKind:
          input.kind === "adaptation" || changed > correctionLimit(source.licenseKey)
            ? "adaptation"
            : "correction",
        sourceTranslationId: source.id,
        sourceSnapshot: snapshot,
        sourceHash: snapshotHash(snapshot),
        sourceImportId: latest?.id ?? null,
        content: applyWording(snapshot.content, input.text),
        changeNote: input.changeNote?.trim() || null,
        wordCount: wordCount(input.text),
      },
    };
  }

  /**
   * Saves a verse choice with a revision, and whatever else `also` records with it. Its notes
   * go where they no longer apply: all of them for a translation's wording taken unchanged, the
   * changes to a source's notes when the source changes or its note is gone.
   */
  private async store(
    owner: User,
    { c, base, verse, entered }: VerseAt,
    row: VerseRow,
    also: (tx: Transaction, saved: ChoiceRow) => Promise<void>,
  ): Promise<VerseChoiceView> {
    const saved = await this.db.transaction(async (tx) => {
      const [before] = await tx
        .select({ source: compilationVerse.sourceTranslationId })
        .from(compilationVerse)
        .where(and(eq(compilationVerse.compilationId, c.id), eq(compilationVerse.entered, entered)))
        .for("update");
      const [r] = await tx
        .insert(compilationVerse)
        .values({ ...row, compilationId: c.id, entered, scope: verse.range as OrdinalRange })
        .onConflictDoUpdate({
          target: [compilationVerse.compilationId, compilationVerse.entered],
          set: { ...row, updatedAt: new Date() },
        })
        .returning();
      if (!r) throw new Error("no verse choice");
      const kept = new Set(
        row.origin === "edited" && before?.source === row.sourceTranslationId
          ? (row.sourceSnapshot as Snapshot).notes.map((n) => n.position)
          : [],
      );
      const rows = await tx
        .select()
        .from(compilationNote)
        .where(eq(compilationNote.compilationVerseId, r.id));
      const gone = rows.filter(
        (n) => row.origin === "source" || (n.origin !== "own" && !kept.has(n.position)),
      );
      if (gone.length > 0)
        await tx.delete(compilationNote).where(
          inArray(
            compilationNote.id,
            gone.map((n) => n.id),
          ),
        );
      await tx.insert(compilationVerseRevision).values({
        compilationId: c.id,
        entered,
        authorId: owner.id,
        origin: row.origin,
        editKind: row.editKind ?? null,
        sourceTranslationId: row.sourceTranslationId ?? null,
        content: row.content ?? null,
        changeNote: row.changeNote ?? null,
        notes: revisionNotes(rows.filter((n) => !gone.includes(n))),
      });
      await also(tx, r);
      await tx.update(compilation).set({ updatedAt: new Date() }).where(eq(compilation.id, c.id));
      return r;
    });
    if (!saved) throw new Error("no verse choice");
    const counts = await this.translations.verseCounts(base.id);
    const [view] = await this.choiceViews(c.id, counts, saved.id);
    if (!view) throw new Error("no verse choice");
    return view;
  }

  /**
   * Removes a single-verse choice: the verse is inherited again. Its history is kept; an own
   * rendering's evidence isn't (domain-model §2.3.1, "Privacy").
   */
  async removeVerse(owner: User, slug: string, id: string): Promise<CompilationView> {
    const { c } = await this.find(owner, slug);
    await this.db.transaction(async (tx) => {
      const [removed] = await tx
        .delete(compilationVerse)
        .where(and(eq(compilationVerse.id, id), eq(compilationVerse.compilationId, c.id)))
        .returning({ entered: compilationVerse.entered });
      if (!removed) throw new NotFoundException({ code: "unknown-verse-choice" });
      await tx
        .insert(compilationVerseRevision)
        .values({ compilationId: c.id, entered: removed.entered, authorId: owner.id });
      await this.authorship.clear(tx, c.id, removed.entered);
    });
    return this.view(owner, slug);
  }

  /** The compilation's single-verse choices (or one of them), in canonical order. */
  private async choiceViews(
    compilationId: string,
    counts: VerseCounts,
    only?: string,
  ): Promise<VerseChoiceView[]> {
    const rows = await this.db
      .select({ v: compilationVerse, source: translation })
      .from(compilationVerse)
      .leftJoin(translation, eq(translation.id, compilationVerse.sourceTranslationId))
      .where(
        only
          ? and(eq(compilationVerse.compilationId, compilationId), eq(compilationVerse.id, only))
          : eq(compilationVerse.compilationId, compilationId),
      )
      .orderBy(asc(sql`lower(${compilationVerse.scope})`));
    return Promise.all(
      rows.map(async ({ v, source }) => {
        let sourceChanged = false;
        if (v.origin === "edited" && source) {
          // The source verse now: the one whose canonical verses are exactly this verse's.
          const now = (await this.translations.versesOverlapping(source.id, v.scope)).filter(
            (s) => s.range?.start === v.scope.start && s.range.end === v.scope.end,
          );
          sourceChanged =
            now.length !== 1 || snapshotHash(snapshotOf(now[0] as StoredVerse)) !== v.sourceHash;
        }
        const at = parseOsisPassage(v.entered);
        return {
          id: v.id,
          entered: v.entered,
          label: formatPassage(at, { verses: counts }),
          origin: v.origin === "ai_assisted" ? ("edited" as const) : v.origin,
          editKind: v.editKind,
          source: source ? sourceView(source) : null,
          changeNote: v.changeNote,
          sourceChanged,
        };
      }),
    );
  }

  private async find(owner: User, slug: string) {
    const [found] = await this.db
      .select({ c: compilation, base: translation })
      .from(compilation)
      .innerJoin(translation, eq(translation.id, compilation.baseTranslationId))
      .where(and(eq(compilation.ownerId, owner.id), eq(compilation.slug, slug.toLowerCase())));
    if (!found) throw new NotFoundException({ code: "unknown-compilation" });
    if (!owner.handle) throw new ForbiddenException({ code: "handle-required" });
    return found;
  }
}

/** The source verse's notes an edit snapshotted; none for the user's own wording. */
const sourceNotes = (choice: ChoiceRow): Snapshot["notes"] =>
  choice.origin === "edited" ? (choice.sourceSnapshot as Snapshot).notes : [];

const sourceView = (t: typeof translation.$inferSelect): SourceView => ({
  id: t.catalogId,
  abbreviation: t.abbreviation,
  name: t.name,
});

/**
 * The parts of a passage before and after one chapter of its book (in the compilation's
 * numbering): what's left of it when that chapter is given to another source.
 */
function outsideChapter(p: Passage, chapter: Passage, counts: VerseCounts): Passage[] {
  const { book, chapter: n } = chapter.start;
  const at = (ch: number, verse: number) => ({ book, chapter: ch, verse, part: 0 });
  const rest: Passage[] = [];
  const before = counts.verses(book, n - 1);
  if (p.start.book === book && p.start.chapter < n && before)
    rest.push({ start: p.start, end: at(n - 1, before.last) });
  const after = counts.verses(book, n + 1);
  if (p.end.book === book && p.end.chapter > n && after)
    rest.push({ start: at(n + 1, after.first), end: p.end });
  return rest;
}

const summary = (
  owner: User,
  c: typeof compilation.$inferSelect,
  base: typeof translation.$inferSelect,
): CompilationSummary => ({
  id: `@${owner.handle}/${c.slug}`,
  slug: c.slug,
  title: c.title,
  abbreviation: c.abbreviation,
  base: sourceView(base),
  language: base.language,
  direction: base.direction,
});

/** A whole book, one whole chapter, or a range of verses (in the compilation's numbering). */
function kindOf(p: Passage, counts: VerseCounts): RuleKind {
  const chapters = counts.chapters(p.start.book);
  const first = counts.verses(p.start.book, p.start.chapter)?.first;
  const last = counts.verses(p.end.book, p.end.chapter)?.last;
  const wholeChapters = p.start.verse === first && p.end.verse === last;
  if (wholeChapters && p.start.chapter === chapters?.first && p.end.chapter === chapters.last)
    return "book";
  if (wholeChapters && p.start.chapter === p.end.chapter) return "chapter";
  return "range";
}
