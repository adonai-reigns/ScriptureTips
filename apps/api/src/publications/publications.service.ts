import { randomBytes } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  and,
  asc,
  compilation,
  desc,
  eq,
  inArray,
  publication,
  publicationChapter,
  publicationVersion,
  user,
} from "@scripturetips/db";
import { formatOsisPassage } from "@scripturetips/passage";
import { formatPassage, parseReference } from "@scripturetips/reference";
import type { SchemeId } from "@scripturetips/versification";
import type { User } from "../auth/session.ts";
import {
  type CompilationSnapshot,
  CompilationsService,
  type CompilationVerse,
} from "../compilations/compilations.service.ts";
import { snapshotHash } from "../compilations/wording.ts";
import { DATABASE, type Database } from "../database.ts";
import {
  MAX_VERSES,
  type PassageResult,
  type TranslationBookSummary,
  TranslationsService,
  wholeChapters,
} from "../translations/translations.service.ts";

export type Visibility = "unlisted" | "public";

interface SourceView {
  readonly id: string;
  readonly abbreviation: string;
  readonly name: string;
}

/** A version's snapshot, apart from its verses (`publication_version.meta`). */
export interface VersionMeta {
  readonly title: string;
  readonly abbreviation: string;
  readonly handle: string;
  readonly language: string;
  readonly direction: "ltr" | "rtl";
  readonly scheme: string;
  readonly base: SourceView;
  /** The license composition: each translation drawn on, under which license, for how many verses. */
  readonly sources: (SourceView & { readonly license: string; readonly verses: number })[];
  readonly verses: number;
  readonly own: number;
  readonly corrected: number;
  readonly adapted: number;
}

export interface VersionView {
  /** The version ID: authoritative in a pinned link (domain-model §1.6). */
  readonly id: string;
  readonly number: number;
  readonly publishedAt: string;
  readonly changeNote: string | null;
  /** Verses changed since the previous version; null for the first. */
  readonly changedVerses: number | null;
  readonly verseCount: number;
  readonly contentHash: string;
  readonly previousHash: string | null;
}

/** The owner's view of a compilation's publication: how it's shared, and every version. */
export interface PublicationView {
  readonly id: string;
  readonly handle: string;
  readonly slug: string;
  readonly title: string;
  readonly visibility: Visibility;
  readonly status: "active" | "withdrawn";
  readonly versions: VersionView[];
}

/** What a reader opened: the publication, the version they read, and the latest they may see. */
interface Opened {
  readonly pub: typeof publication.$inferSelect;
  readonly handle: string;
  readonly version: typeof publicationVersion.$inferSelect;
  /** The latest version, when it's public: a pinned older version says a newer one exists. */
  readonly latest: { readonly id: string; readonly number: number } | null;
}

/** Changed verses listed in a version's change summary; beyond this, only the count is kept. */
const LISTED_CHANGES = 1000;
const ID_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/**
 * A public ID (domain-model §1.1): 10 random URL-safe characters, with letters among them, so it
 * can't be mistaken for a passage reference in a path (§1.6).
 */
export function publicId(): string {
  for (;;) {
    const id = [...randomBytes(10)].map((b) => ID_ALPHABET[b % 62]).join("");
    if ((id.match(/[A-Za-z]/g)?.length ?? 0) >= 2) return id;
  }
}

/**
 * Publications (domain-model §2.3): a compilation published as numbered versions that never
 * change, each a full snapshot hash-chained to the one before. Readers reach a public
 * publication's latest version by its path, and any version by its pinned link; an unlisted one
 * only by a pinned link (the version ID is the key). The publishing procedure's checks and
 * review come next (§1.4); for now publishing refuses only verses still pasted.
 */
@Injectable()
export class PublicationsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(CompilationsService) private readonly compilations: CompilationsService,
    @Inject(TranslationsService) private readonly translations: TranslationsService,
  ) {}

  /** The publication of the owner's compilation, or null if it hasn't been published. */
  async ofCompilation(owner: User, slug: string): Promise<PublicationView | null> {
    const [found] = await this.db
      .select({ p: publication })
      .from(publication)
      .innerJoin(compilation, eq(compilation.id, publication.compilationId))
      .where(and(eq(compilation.ownerId, owner.id), eq(compilation.slug, slug.toLowerCase())));
    return found ? this.view(owner, found.p) : null;
  }

  /**
   * Publishes the compilation as its next version: the first publish creates the publication
   * under the compilation's slug. `visibility` applies from this version on.
   */
  async publish(
    owner: User,
    slug: string,
    input: { visibility: Visibility; changeNote?: string | undefined },
  ): Promise<PublicationView> {
    const snapshot = await this.compilations.snapshot(owner, slug);
    if (snapshot.pasted.length > 0)
      throw new BadRequestException({ code: "pasted-verses", verses: snapshot.pasted });
    const handle = owner.handle as string;
    const c = snapshot.compilation;
    const chapters = snapshot.books.flatMap((b, position) =>
      b.chapters.map((ch) => ({
        book: b.osis,
        chapter: ch.chapter,
        position,
        verses: ch.verses,
        hash: snapshotHash(ch.verses),
      })),
    );
    const meta = metaOf(snapshot, handle);

    const published = await this.db.transaction(async (tx) => {
      const [byCompilation] = await tx
        .select()
        .from(publication)
        .where(eq(publication.compilationId, c.id))
        .for("update");
      let pub = byCompilation;
      if (!pub) {
        // A slug once published stays with that publication (domain-model §1.6).
        const [taken] = await tx
          .select({ id: publication.id })
          .from(publication)
          .where(and(eq(publication.ownerId, owner.id), eq(publication.slug, c.slug)));
        if (taken) throw new ConflictException({ code: "slug-published" });
        [pub] = await tx
          .insert(publication)
          .values({
            publicId: publicId(),
            compilationId: c.id,
            ownerId: owner.id,
            slug: c.slug,
            title: c.title,
            abbreviation: c.abbreviation,
            visibility: input.visibility,
            baseTranslationId: snapshot.base.id,
            scheme: c.scheme,
          })
          .returning();
      } else
        [pub] = await tx
          .update(publication)
          .set({
            title: c.title,
            abbreviation: c.abbreviation,
            visibility: input.visibility,
            updatedAt: new Date(),
          })
          .where(eq(publication.id, pub.id))
          .returning();
      if (!pub) throw new Error("no publication");

      const [previous] = await tx
        .select()
        .from(publicationVersion)
        .where(eq(publicationVersion.publicationId, pub.id))
        .orderBy(desc(publicationVersion.number))
        .limit(1);
      const number = (previous?.number ?? 0) + 1;
      const versionId = publicId();
      const contentHash = snapshotHash({
        publication: pub.publicId,
        version: versionId,
        number,
        previous: previous?.contentHash ?? null,
        meta,
        chapters: chapters.map((ch) => [ch.book, ch.chapter, ch.hash]),
      });
      const [version] = await tx
        .insert(publicationVersion)
        .values({
          publicId: versionId,
          publicationId: pub.id,
          number,
          status: "published",
          meta,
          changeNote: input.changeNote?.trim() || null,
          changeSummary: previous ? await this.changes(tx, previous.id, chapters) : null,
          verseCount: meta.verses,
          contentHash,
          previousHash: previous?.contentHash ?? null,
        })
        .returning();
      if (!version) throw new Error("no version");
      for (let i = 0; i < chapters.length; i += 100)
        await tx
          .insert(publicationChapter)
          .values(chapters.slice(i, i + 100).map((ch) => ({ ...ch, versionId: version.id })));
      return pub;
    });
    return this.view(owner, published);
  }

  /** The verses that differ from the previous version, compared chapter by chapter. */
  private async changes(
    tx: Parameters<Parameters<Database["transaction"]>[0]>[0],
    previousId: string,
    chapters: readonly {
      book: string;
      chapter: number;
      verses: CompilationVerse[];
      hash: string;
    }[],
  ): Promise<{ verses: number; changed: string[] }> {
    const before = await tx
      .select({
        book: publicationChapter.book,
        chapter: publicationChapter.chapter,
        hash: publicationChapter.hash,
      })
      .from(publicationChapter)
      .where(eq(publicationChapter.versionId, previousId));
    const hashes = new Map(before.map((b) => [`${b.book}.${b.chapter}`, b.hash]));
    const differing = chapters.filter((ch) => hashes.get(`${ch.book}.${ch.chapter}`) !== ch.hash);
    const changed: string[] = [];
    for (const ch of differing) {
      const [old] = await tx
        .select({ verses: publicationChapter.verses })
        .from(publicationChapter)
        .where(
          and(
            eq(publicationChapter.versionId, previousId),
            eq(publicationChapter.book, ch.book),
            eq(publicationChapter.chapter, ch.chapter),
          ),
        );
      const was = new Map(
        ((old?.verses ?? []) as CompilationVerse[]).map((v) => [v.verse, snapshotHash(v)]),
      );
      for (const v of ch.verses)
        if (was.get(v.verse) !== snapshotHash(v))
          changed.push(`${ch.book}.${ch.chapter}.${v.verse}`);
    }
    return { verses: changed.length, changed: changed.slice(0, LISTED_CHANGES) };
  }

  private async view(owner: User, p: typeof publication.$inferSelect): Promise<PublicationView> {
    const versions = await this.db
      .select()
      .from(publicationVersion)
      .where(eq(publicationVersion.publicationId, p.id))
      .orderBy(desc(publicationVersion.number));
    return {
      id: p.publicId,
      handle: owner.handle as string,
      slug: p.slug,
      title: p.title,
      visibility: p.visibility,
      status: p.status,
      versions: versions.map(versionView),
    };
  }

  /**
   * The one access check for reading a publication (domain-model §1.2): a pinned version is
   * readable by anyone with its link while it's published; without one, only a public, active
   * publication's latest version is.
   */
  private async open(handle: string, slug: string, version?: string): Promise<Opened> {
    const [found] = await this.db
      .select({ pub: publication, handle: user.handle })
      .from(publication)
      .innerJoin(user, eq(user.id, publication.ownerId))
      .where(and(eq(user.handle, handle.toLowerCase()), eq(publication.slug, slug.toLowerCase())));
    if (!found?.handle) throw new NotFoundException({ code: "unknown-publication" });
    const { pub } = found;
    const listed = pub.visibility === "public" && pub.status === "active";
    const [latest] = await this.db
      .select()
      .from(publicationVersion)
      .where(
        and(
          eq(publicationVersion.publicationId, pub.id),
          eq(publicationVersion.status, "published"),
        ),
      )
      .orderBy(desc(publicationVersion.number))
      .limit(1);
    let chosen = version ? undefined : listed ? latest : undefined;
    if (version)
      [chosen] = await this.db
        .select()
        .from(publicationVersion)
        .where(
          and(
            eq(publicationVersion.publicationId, pub.id),
            eq(publicationVersion.publicId, version),
            eq(publicationVersion.status, "published"),
          ),
        );
    if (!chosen) throw new NotFoundException({ code: "unknown-publication" });
    return {
      pub,
      handle: found.handle,
      version: chosen,
      latest: listed && latest ? { id: latest.publicId, number: latest.number } : null,
    };
  }

  /** A version's books and chapters, in the publication's order. */
  async books(
    handle: string,
    slug: string,
    version?: string,
  ): Promise<{ books: TranslationBookSummary[]; publication: ReturnType<typeof readerView> }> {
    const opened = await this.open(handle, slug, version);
    const rows = await this.db
      .select({ book: publicationChapter.book, chapter: publicationChapter.chapter })
      .from(publicationChapter)
      .where(eq(publicationChapter.versionId, opened.version.id))
      .orderBy(asc(publicationChapter.position), asc(publicationChapter.chapter));
    const books: { osis: string; chapters: number[] }[] = [];
    for (const r of rows) {
      const last = books.at(-1);
      if (last?.osis === r.book) last.chapters.push(r.chapter);
      else books.push({ osis: r.book, chapters: [r.chapter] });
    }
    return { books, publication: readerView(opened) };
  }

  /** A passage of a version, read like a translation's: `?ref=Genesis 1`. */
  async passage(handle: string, slug: string, reference: string, version?: string) {
    const opened = await this.open(handle, slug, version);
    const meta = opened.version.meta as VersionMeta;
    const counts = await this.translations.verseCounts(opened.pub.baseTranslationId);
    const parsed = parseReference(reference, {
      scheme: opened.pub.scheme as SchemeId,
      verses: counts,
    });
    if (!parsed.ok)
      throw new BadRequestException({ code: parsed.error.code, index: parsed.error.index });
    const passages: (PassageResult & { verses: CompilationVerse[] })[] = [];
    let total = 0;
    for (const ref of parsed.references) {
      const { start, end } = ref.entered;
      const rows = await this.db
        .select({ chapter: publicationChapter.chapter, verses: publicationChapter.verses })
        .from(publicationChapter)
        .where(
          and(
            eq(publicationChapter.versionId, opened.version.id),
            eq(publicationChapter.book, start.book),
            inArray(
              publicationChapter.chapter,
              Array.from({ length: end.chapter - start.chapter + 1 }, (_, i) => start.chapter + i),
            ),
          ),
        )
        .orderBy(asc(publicationChapter.chapter));
      // The verses the passage covers; a bridged verse counts once (as `versesIn`).
      const at = (chapter: number, verse: number) => chapter * 1000 + verse;
      const verses = rows
        .flatMap((r) => r.verses as CompilationVerse[])
        .filter(
          (v) =>
            at(v.chapter, v.to ?? v.verse) >= at(start.chapter, start.verse) &&
            at(v.chapter, v.verse) <= at(end.chapter, end.verse),
        );
      total += verses.length;
      if (total > MAX_VERSES)
        throw new BadRequestException({ code: "too-many-verses", limit: MAX_VERSES });
      passages.push({
        entered: formatOsisPassage(ref.entered),
        canonical: ref.canonical ? formatOsisPassage(ref.canonical) : null,
        label: formatPassage(ref.entered, { verses: counts }),
        wholeChapters: wholeChapters(ref.entered, counts),
        verses,
      });
    }
    return {
      translation: {
        id: `${opened.handle}/${opened.pub.slug}`,
        abbreviation: meta.abbreviation,
        name: meta.title,
        language: meta.language,
        direction: meta.direction,
        scheme: meta.scheme,
        license: "publication",
      },
      passages,
      sources: meta.sources.map(({ id, abbreviation, name }) => ({ id, abbreviation, name })),
      publication: readerView(opened),
    };
  }
}

const versionView = (v: typeof publicationVersion.$inferSelect): VersionView => ({
  id: v.publicId,
  number: v.number,
  publishedAt: v.publishedAt.toISOString(),
  changeNote: v.changeNote,
  changedVerses: (v.changeSummary as { verses: number } | null)?.verses ?? null,
  verseCount: v.verseCount,
  contentHash: v.contentHash,
  previousHash: v.previousHash,
});

/** What a reader is told about the publication and the version they're reading. */
const readerView = (o: Opened) => ({
  id: o.pub.publicId,
  handle: o.handle,
  slug: o.pub.slug,
  title: (o.version.meta as VersionMeta).title,
  abbreviation: (o.version.meta as VersionMeta).abbreviation,
  direction: (o.version.meta as VersionMeta).direction,
  visibility: o.pub.visibility,
  version: versionView(o.version),
  latest: o.latest,
});

function metaOf(s: CompilationSnapshot, handle: string): VersionMeta {
  const source = (t: CompilationSnapshot["base"]): SourceView => ({
    id: t.catalogId,
    abbreviation: t.abbreviation,
    name: t.name,
  });
  return {
    title: s.compilation.title,
    abbreviation: s.compilation.abbreviation,
    handle,
    language: s.base.language,
    direction: s.base.direction,
    scheme: s.compilation.scheme,
    base: source(s.base),
    sources: s.sources.map(({ translation: t, verses }) => ({
      ...source(t),
      license: t.licenseKey,
      verses,
    })),
    verses: s.sources.reduce((n, x) => n + x.verses, 0) + s.own,
    own: s.own,
    corrected: s.corrected,
    adapted: s.adapted,
  };
}
