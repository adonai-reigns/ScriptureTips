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
  compilationRule,
  eq,
  inArray,
  sql,
  translation,
  verseText,
} from "@scripturetips/db";
import { canBeBase, canCompile } from "@scripturetips/licenses";
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
import { type Layer, layersFor, matchingVerse, type RuleKind } from "./resolve.ts";

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

export interface CompilationView extends CompilationSummary {
  readonly scheme: string;
  readonly rules: RuleView[];
}

/** A compilation's verse, with the translation it was taken from (`source`, a catalog ID). */
export type CompilationVerse = PassageVerse & { readonly source: string };

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
    // A compilation mustn't pass for a published translation (e.g. the WEB's name rule, licenses.md §3.3).
    const [clash] = await this.db
      .select({ id: translation.id })
      .from(translation)
      .where(
        sql`lower(${translation.abbreviation}) = ${input.abbreviation.toLowerCase()} or lower(${translation.name}) = ${input.title.toLowerCase()}`,
      );
    if (clash) throw new BadRequestException({ code: "name-of-translation" });
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
      return { ...summary(owner, created, base), scheme: created.scheme, rules: [] };
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException({ code: "abbreviation-taken" });
      throw e;
    }
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
    const sourceRows = rules.length
      ? await this.db
          .select()
          .from(translation)
          .where(inArray(translation.id, [...new Set(rules.map((r) => r.sourceTranslationId))]))
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
      const verses = await this.resolve(baseVerses, base.id, layers);
      for (const v of verses) {
        const t = sources.get(v.from);
        if (t && !used.has(t.id)) used.set(t.id, sourceView(t));
      }
      passages.push({
        entered: formatOsisPassage(ref.entered),
        canonical: ref.canonical ? formatOsisPassage(ref.canonical) : null,
        label: formatPassage(ref.entered, { verses: counts }),
        wholeChapters: wholeChapters(ref.entered, counts),
        verses: verses.map(({ verse, from }) => ({
          ...verse,
          source: sources.get(from)?.catalogId ?? base.catalogId,
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

  /** Each base verse, or the same verse from the most specific layer whose source has it. */
  private async resolve(
    baseVerses: readonly StoredVerse[],
    baseId: string,
    layers: readonly Layer[],
  ): Promise<{ verse: PassageVerse; from: string }[]> {
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
    const fromSource = new Map<string, StoredVerse[]>();
    for (const id of new Set(relevant.map((l) => l.sourceId))) {
      if (span) fromSource.set(id, await this.translations.versesOverlapping(id, span));
    }
    return baseVerses.map((b) => {
      const { range: _, ...baseVerse } = b;
      for (const layer of layersFor(b, relevant)) {
        const found = matchingVerse(b, fromSource.get(layer.sourceId) ?? []);
        if (found) {
          const { range: __, ...v } = found;
          // The compilation's numbering, the source's words.
          return {
            verse: { ...v, chapter: b.chapter, verse: b.verse, to: b.to, published: b.published },
            from: layer.sourceId,
          };
        }
      }
      return { verse: baseVerse, from: baseId };
    });
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

const sourceView = (t: typeof translation.$inferSelect): SourceView => ({
  id: t.catalogId,
  abbreviation: t.abbreviation,
  name: t.name,
});

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
