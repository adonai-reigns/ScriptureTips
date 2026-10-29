import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BUILD_FILES,
  type BuildFile,
  buildPrefix,
  describeCompilation,
  type SourceVerse,
} from "@scripturetips/book";
import { and, compilation, desc, eq, gt, inArray, pdfBuild } from "@scripturetips/db";
import { BOOKS } from "@scripturetips/passage";
import { formatPassage, parseReference } from "@scripturetips/reference";
import type { SchemeId } from "@scripturetips/versification";
import type { User } from "../auth/session.ts";
import { CompilationsService } from "../compilations/compilations.service.ts";
import { DATABASE, type Database } from "../database.ts";
import { checkSnapshot, type Problem } from "../publications/checks.ts";
import { TranslationsService } from "../translations/translations.service.ts";
import type { BuildSettings } from "./settings.ts";

/** Injection token for the build settings (`@Inject(BUILD_SETTINGS)`). */
export const BUILD_SETTINGS = Symbol("build settings");

export interface BuildView {
  readonly id: string;
  /** What it covers, as entered ("Ruth"); null for the whole compilation. */
  readonly scope: string | null;
  readonly status: "queued" | "building" | "done" | "failed";
  readonly pages: number | null;
  /** The cover's spine width, in mm. */
  readonly spine: number | null;
  readonly error: string | null;
  readonly requestedAt: string;
  readonly finishedAt: string | null;
  /** The files that can be downloaded now. */
  readonly files: BuildFile[];
}

/** Problems that stop even a private PDF: the text may not be used, or not changed, at all. */
const BLOCKING: ReadonlySet<Problem["code"]> = new Set([
  "unknown-license",
  "modification-not-allowed",
]);

type Row = typeof pdfBuild.$inferSelect;

const view = (r: Row): BuildView => ({
  id: r.id,
  scope: r.scope,
  status: r.status,
  pages: r.pages,
  spine: r.spine,
  error: r.error,
  requestedAt: r.requestedAt.toISOString(),
  finishedAt: r.finishedAt?.toISOString() ?? null,
  files:
    r.status === "done"
      ? (Object.keys(BUILD_FILES) as BuildFile[])
      : r.status === "failed"
        ? ["book.json"]
        : [],
});

/**
 * PDF builds of a compilation (book-designer.md §8, §9; editions come later): describes the book,
 * stores its `book.json`, and queues it for the PDF worker. A build is private, for the user's
 * own use, so only the license problems that forbid any use or change stop it; what an edition
 * may carry when it's given away or sold is checked with editions (domain-model §7).
 */
@Injectable()
export class PdfBuildsService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    @Inject(CompilationsService) private readonly compilations: CompilationsService,
    @Inject(TranslationsService) private readonly translations: TranslationsService,
    @Inject(BUILD_SETTINGS) private readonly settings: BuildSettings,
  ) {}

  /** The compilation's builds, newest first, with their state brought up to date. */
  async list(owner: User, slug: string): Promise<BuildView[]> {
    const c = await this.compilation(owner, slug);
    const rows = await this.db
      .select()
      .from(pdfBuild)
      .where(eq(pdfBuild.compilationId, c.id))
      .orderBy(desc(pdfBuild.requestedAt))
      .limit(20);
    return (await this.refresh(rows)).map(view);
  }

  /**
   * Queues a build of the compilation, or of the books and chapters `scope` names. One build at
   * a time per user, and at most the daily limit (vision §7.1).
   */
  async request(owner: User, slug: string, scope?: string): Promise<BuildView> {
    const c = await this.compilation(owner, slug);
    const chosen = scope ? await this.chapters(c, scope) : undefined;
    const pending = await this.refresh(
      await this.db
        .select()
        .from(pdfBuild)
        .where(
          and(eq(pdfBuild.requestedBy, owner.id), inArray(pdfBuild.status, ["queued", "building"])),
        ),
    );
    if (pending.some((r) => r.status === "queued" || r.status === "building"))
      throw new ConflictException({ code: "build-in-progress" });
    const today = await this.db
      .select({ id: pdfBuild.id })
      .from(pdfBuild)
      .where(
        and(
          eq(pdfBuild.requestedBy, owner.id),
          gt(pdfBuild.requestedAt, new Date(Date.now() - 24 * 60 * 60 * 1000)),
        ),
      );
    if (today.length >= this.settings.dailyLimit)
      throw new HttpException(
        { code: "daily-build-limit", limit: this.settings.dailyLimit },
        HttpStatus.TOO_MANY_REQUESTS,
      );

    const whole = await this.compilations.snapshot(owner, slug, chosen?.books);
    // Only the chosen chapters, and only the sources they draw on, are checked and credited.
    const books = whole.books
      .map((b) => ({
        ...b,
        chapters: b.chapters.filter((ch) => !chosen || chosen.has(b.osis, ch.chapter)),
      }))
      .filter((b) => b.chapters.length > 0);
    const used = new Set(
      books.flatMap((b) => b.chapters.flatMap((ch) => ch.verses.map((v) => v.source))),
    );
    const snapshot = {
      ...whole,
      books,
      sources: whole.sources.filter((s) => used.has(s.translation.catalogId)),
    };
    const { problems, attributions } = checkSnapshot(snapshot, []);
    const blocking = problems.filter((p) => BLOCKING.has(p.code));
    if (blocking.length > 0)
      throw new BadRequestException({ code: "build-not-allowed", problems: blocking });
    const book = describeCompilation({
      title: snapshot.compilation.title,
      subtitle: chosen ? chosen.label : snapshot.compilation.abbreviation,
      books: books.map((b) => ({
        osis: b.osis,
        chapters: b.chapters.map((ch) => ({
          chapter: ch.chapter,
          verses: ch.verses as unknown as SourceVerse[],
        })),
      })),
      attributions,
    });
    if (book.body.length === 2) throw new BadRequestException({ code: "nothing-to-build" });

    const [row] = await this.db
      .insert(pdfBuild)
      .values({
        compilationId: c.id,
        requestedBy: owner.id,
        scope: scope ?? null,
        status: "queued",
      })
      .returning();
    if (!row) throw new Error("no build");
    await this.settings.store.put(
      `${buildPrefix(row.id)}book.json`,
      JSON.stringify(book),
      BUILD_FILES["book.json"],
    );
    await this.settings.queue.add({ buildId: row.id });
    return view(row);
  }

  /** One of a build's files, if it has been made. */
  async file(owner: User, slug: string, id: string, name: BuildFile) {
    const c = await this.compilation(owner, slug);
    const [row] = await this.db
      .select()
      .from(pdfBuild)
      .where(and(eq(pdfBuild.id, id), eq(pdfBuild.compilationId, c.id)));
    if (!row) throw new NotFoundException({ code: "unknown-build" });
    const [current] = await this.refresh([row]);
    if (!current || !view(current).files.includes(name))
      throw new NotFoundException({ code: "file-not-ready" });
    const file = await this.settings.store.get(`${buildPrefix(id)}${name}`);
    if (!file) throw new NotFoundException({ code: "file-not-ready" });
    return { ...file, name: `${c.slug}-${name}` };
  }

  /** Deletes the files of every build of the compilation, before the compilation goes. */
  async removeFiles(owner: User, slug: string): Promise<void> {
    const c = await this.compilation(owner, slug);
    const rows = await this.db
      .select({ id: pdfBuild.id })
      .from(pdfBuild)
      .where(eq(pdfBuild.compilationId, c.id));
    for (const r of rows) await this.settings.store.removeAll(buildPrefix(r.id));
  }

  /** Brings queued and running builds up to date with the queue. */
  private async refresh(rows: Row[]): Promise<Row[]> {
    return Promise.all(
      rows.map(async (r) => {
        if (r.status !== "queued" && r.status !== "building") return r;
        const job = await this.settings.queue.state(r.id);
        const change: Partial<Row> | null = !job
          ? { status: "failed", error: "lost", finishedAt: new Date() }
          : job.state === "completed"
            ? {
                status: "done",
                pages: job.result.pages,
                spine: job.result.spine,
                finishedAt: new Date(),
              }
            : job.state === "failed"
              ? { status: "failed", error: job.error, finishedAt: new Date() }
              : job.state === "active" && r.status === "queued"
                ? { status: "building" }
                : null;
        if (!change) return r;
        const [updated] = await this.db
          .update(pdfBuild)
          .set(change)
          .where(eq(pdfBuild.id, r.id))
          .returning();
        return updated ?? r;
      }),
    );
  }

  private async compilation(owner: User, slug: string) {
    const [c] = await this.db
      .select()
      .from(compilation)
      .where(and(eq(compilation.ownerId, owner.id), eq(compilation.slug, slug.toLowerCase())));
    if (!c) throw new NotFoundException({ code: "unknown-compilation" });
    return c;
  }

  /**
   * The books and chapters a reference names, whole chapters: "Ruth", "Genesis 1–11", "John 3:16"
   * (all of John 3).
   */
  private async chapters(c: typeof compilation.$inferSelect, scope: string) {
    const counts = await this.translations.verseCounts(c.baseTranslationId);
    const parsed = parseReference(scope, { scheme: c.scheme as SchemeId, verses: counts });
    if (!parsed.ok)
      throw new BadRequestException({ code: parsed.error.code, index: parsed.error.index });
    const order = new Map(BOOKS.map((b, i) => [b.osis, i]));
    const at = (book: string, chapter: number) => (order.get(book) ?? 0) * 1000 + chapter;
    const ranges = parsed.references.map((r) => [
      at(r.entered.start.book, r.entered.start.chapter),
      at(r.entered.end.book, r.entered.end.chapter),
    ]);
    const has = (book: string, chapter: number) =>
      ranges.some(([from = 0, to = 0]) => at(book, chapter) >= from && at(book, chapter) <= to);
    const books = new Set(
      BOOKS.filter((b) =>
        ranges.some(([from = 0, to = 0]) => {
          const i = order.get(b.osis) ?? 0;
          return i >= Math.floor(from / 1000) && i <= Math.floor(to / 1000);
        }),
      ).map((b) => b.osis),
    );
    const label = parsed.references
      .map((r) => formatPassage(r.entered, { verses: counts }))
      .join("; ");
    return { books, has, label };
  }
}
