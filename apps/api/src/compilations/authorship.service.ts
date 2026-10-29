import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  and,
  asc,
  authorshipDeclaration,
  authorshipJournal,
  compositionEvent,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  similarityReport,
  studyTrail,
  translation,
} from "@scripturetips/db";
import type { User } from "../auth/session.ts";
import { DATABASE, type Database } from "../database.ts";
import {
  applyDelta,
  type EventKind,
  eventHash,
  journalHash,
  type RecordedEvent,
  textHash,
  verifyJournal,
} from "./journal.ts";
import { isTakenFrom, similarity } from "./similarity.ts";

/**
 * The version of the authorship declaration's wording (domain-model §2.3.1). The web app shows
 * the statement of this version and sends its number back; change both together.
 */
export const AUTHORSHIP_STATEMENT = 1;

/** Most characters a rendering may have, and most events one session may record. */
export const MAX_TEXT = 5000;
const MAX_EVENTS = 10_000;

/** A translation's wording of the verse being rendered. */
export interface Candidate {
  readonly translation: typeof translation.$inferSelect;
  readonly text: string;
  /** It's shown in the editor (its license lets it be compiled), so it can be pasted from. */
  readonly shown: boolean;
}

export interface EventInput {
  readonly kind: EventKind;
  readonly position: number;
  readonly removed: string;
  readonly inserted: string;
  readonly elapsed?: number | undefined;
}

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type Executor = Database | Transaction;
type JournalRow = typeof authorshipJournal.$inferSelect;

interface SourceView {
  readonly id: string;
  readonly abbreviation: string;
  readonly name: string;
}

/** What the verse editor shows about an own rendering's evidence. */
export interface AuthorshipSummary {
  /** Writing sessions saved. */
  readonly sessions: number;
  /** Composition events recorded across them. */
  readonly events: number;
  /** Pastes of text from outside ScriptureTips. */
  readonly externalPastes: number;
  /** Every journal's chain checks and replays to its text. */
  readonly verified: boolean;
  readonly declaredAt: string | null;
  readonly similarity: readonly {
    readonly translation: SourceView;
    readonly score: number;
    readonly matched: readonly string[];
  }[];
}

const sourceView = (t: typeof translation.$inferSelect): SourceView => ({
  id: t.catalogId,
  abbreviation: t.abbreviation,
  name: t.name,
});

const header = (j: JournalRow) => ({
  id: j.id,
  authorId: j.authorId,
  compilationId: j.compilationId,
  entered: j.entered,
  startText: j.startText,
  startedAt: j.startedAt,
});

const recorded = (e: typeof compositionEvent.$inferSelect): RecordedEvent => ({
  seq: e.seq,
  at: e.at,
  elapsed: e.elapsed,
  kind: e.kind,
  position: e.position,
  removed: e.removed,
  inserted: e.inserted,
  pasteOrigin: e.pasteOrigin,
  pasteTranslationId: e.pasteTranslationId,
  prevHash: e.prevHash,
  hash: e.hash,
});

/**
 * Authorship evidence for own renderings (domain-model §2.3.1, vision §6.1): the journal of each
 * writing session, the study trail, similarity to every translation, and the declaration. All of
 * it is private to the author, and deleted with the rendering. The compilation service checks
 * ownership and finds the verse; this keeps the records.
 */
@Injectable()
export class AuthorshipService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** Starts a writing session from `startText`, noting the translations the editor shows. */
  async start(
    author: User,
    compilationId: string,
    entered: string,
    startText: string,
    shown: readonly Candidate[],
  ): Promise<{ id: string; text: string }> {
    return this.db.transaction(async (tx) => {
      // A session left unsaved is abandoned when the author starts another.
      await tx
        .delete(authorshipJournal)
        .where(
          and(
            eq(authorshipJournal.compilationId, compilationId),
            eq(authorshipJournal.entered, entered),
            eq(authorshipJournal.authorId, author.id),
            isNull(authorshipJournal.completedAt),
          ),
        );
      const startedAt = new Date();
      const [j] = await tx
        .insert(authorshipJournal)
        .values({
          compilationId,
          entered,
          authorId: author.id,
          startText,
          text: startText,
          headHash: "",
          startedAt,
        })
        .returning();
      if (!j) throw new Error("no journal");
      await tx
        .update(authorshipJournal)
        .set({ headHash: journalHash(header(j)) })
        .where(eq(authorshipJournal.id, j.id));
      if (shown.length > 0)
        await tx.insert(studyTrail).values(
          shown.map((c) => ({
            journalId: j.id,
            at: startedAt,
            resource: "translation_viewed" as const,
            translationId: c.translation.id,
          })),
        );
      return { id: j.id, text: startText };
    });
  }

  /**
   * Adds the editor's events to an open session's chain. A paste of words from a translation the
   * editor shows is `internal`, with that translation; any other paste is `external`.
   */
  async record(
    author: User,
    compilationId: string,
    journalId: string,
    events: readonly EventInput[],
    candidates: (entered: string) => Promise<readonly Candidate[]>,
  ): Promise<{ events: number; length: number }> {
    return this.db.transaction(async (tx) => {
      const [j] = await tx
        .select()
        .from(authorshipJournal)
        .where(
          and(
            eq(authorshipJournal.id, journalId),
            eq(authorshipJournal.compilationId, compilationId),
            eq(authorshipJournal.authorId, author.id),
            isNull(authorshipJournal.completedAt),
          ),
        )
        .for("update");
      if (!j) throw new NotFoundException({ code: "unknown-journal" });
      if (j.events + events.length > MAX_EVENTS)
        throw new BadRequestException({ code: "journal-full" });
      const shown = events.some((e) => e.kind === "paste")
        ? (await candidates(j.entered)).filter((c) => c.shown)
        : [];

      let text = j.text;
      let prev = j.headHash;
      const rows: (typeof compositionEvent.$inferInsert)[] = [];
      for (const [k, e] of events.entries()) {
        const next = applyDelta(text, e);
        if (next === null) throw new BadRequestException({ code: "journal-out-of-step" });
        if (next.length > MAX_TEXT) throw new BadRequestException({ code: "too-long" });
        text = next;
        const from = e.kind === "paste" ? shown.find((c) => isTakenFrom(e.inserted, c.text)) : null;
        const event = {
          seq: j.events + k + 1,
          at: new Date(),
          elapsed: e.elapsed ?? null,
          kind: e.kind,
          position: e.position,
          removed: e.removed,
          inserted: e.inserted,
          pasteOrigin:
            e.kind === "paste" ? (from ? ("internal" as const) : ("external" as const)) : null,
          pasteTranslationId: from?.translation.id ?? null,
          prevHash: prev,
        };
        prev = eventHash(event);
        rows.push({ ...event, journalId: j.id, hash: prev });
      }
      if (rows.length > 0) await tx.insert(compositionEvent).values(rows);
      await tx
        .update(authorshipJournal)
        .set({ text, headHash: prev, events: j.events + rows.length })
        .where(eq(authorshipJournal.id, j.id));
      return { events: j.events + rows.length, length: text.length };
    });
  }

  /** An open session of the author's on this compilation, to save from. */
  async open(author: User, compilationId: string, journalId: string): Promise<JournalRow> {
    const [j] = await this.db
      .select()
      .from(authorshipJournal)
      .where(
        and(
          eq(authorshipJournal.id, journalId),
          eq(authorshipJournal.compilationId, compilationId),
          eq(authorshipJournal.authorId, author.id),
          isNull(authorshipJournal.completedAt),
        ),
      );
    if (!j) throw new NotFoundException({ code: "unknown-journal" });
    return j;
  }

  /** The translations a session pasted from, by catalog row ID, and whether it pasted from outside. */
  async pastes(journalId: string): Promise<{ internal: Set<string>; external: boolean }> {
    const rows = await this.db
      .select({ origin: compositionEvent.pasteOrigin, from: compositionEvent.pasteTranslationId })
      .from(compositionEvent)
      .where(and(eq(compositionEvent.journalId, journalId), eq(compositionEvent.kind, "paste")));
    return {
      internal: new Set(rows.flatMap((r) => (r.origin === "internal" && r.from ? [r.from] : []))),
      external: rows.some((r) => r.origin === "external"),
    };
  }

  /** Closes a saved session: its record stays as evidence for the rendering. */
  async complete(tx: Executor, journalId: string): Promise<void> {
    await tx
      .update(authorshipJournal)
      .set({ completedAt: new Date() })
      .where(eq(authorshipJournal.id, journalId));
  }

  /** Records how closely `text` follows each translation's wording of the verse. */
  async compare(
    tx: Executor,
    compilationId: string,
    entered: string,
    text: string,
    candidates: readonly Candidate[],
  ): Promise<void> {
    await this.clearReports(tx, compilationId, entered);
    if (candidates.length === 0) return;
    const hash = textHash(text);
    await tx.insert(similarityReport).values(
      candidates.map((c) => ({
        compilationId,
        entered,
        translationId: c.translation.id,
        textHash: hash,
        ...similarity(text, c.text),
      })),
    );
  }

  /** Records the author's declaration over `text` and the latest session's chain. */
  async declare(
    tx: Executor,
    author: User,
    compilationId: string,
    entered: string,
    text: string,
    statement: number,
  ): Promise<void> {
    if (statement !== AUTHORSHIP_STATEMENT)
      throw new BadRequestException({ code: "statement-outdated" });
    const [latest] = await tx
      .select({ id: authorshipJournal.id, head: authorshipJournal.headHash })
      .from(authorshipJournal)
      .where(
        and(
          eq(authorshipJournal.compilationId, compilationId),
          eq(authorshipJournal.entered, entered),
          isNotNull(authorshipJournal.completedAt),
        ),
      )
      .orderBy(desc(authorshipJournal.completedAt))
      .limit(1);
    await tx.insert(authorshipDeclaration).values({
      compilationId,
      entered,
      authorId: author.id,
      statementVersion: statement,
      textHash: textHash(text),
      journalId: latest?.id ?? null,
      chainHead: latest?.head ?? null,
    });
  }

  private async clearReports(tx: Executor, compilationId: string, entered: string) {
    await tx
      .delete(similarityReport)
      .where(
        and(
          eq(similarityReport.compilationId, compilationId),
          eq(similarityReport.entered, entered),
        ),
      );
  }

  /**
   * Drops the similarity reports and declarations, keeping the sessions' records: the verse is
   * now an edit of a translation it pasted from, not the author's own.
   */
  async clearClaims(tx: Executor, compilationId: string, entered: string): Promise<void> {
    await this.clearReports(tx, compilationId, entered);
    await tx
      .delete(authorshipDeclaration)
      .where(
        and(
          eq(authorshipDeclaration.compilationId, compilationId),
          eq(authorshipDeclaration.entered, entered),
        ),
      );
  }

  /** Deletes every record of the verse's renderings (domain-model §2.3.1, "Privacy"). */
  async clear(tx: Executor, compilationId: string, entered: string): Promise<void> {
    await this.clearClaims(tx, compilationId, entered);
    await tx
      .delete(authorshipJournal)
      .where(
        and(
          eq(authorshipJournal.compilationId, compilationId),
          eq(authorshipJournal.entered, entered),
        ),
      );
  }

  /** The verse's saved sessions with their events and trails, each checked. */
  private async journals(compilationId: string, entered: string) {
    const journals = await this.db
      .select()
      .from(authorshipJournal)
      .where(
        and(
          eq(authorshipJournal.compilationId, compilationId),
          eq(authorshipJournal.entered, entered),
          isNotNull(authorshipJournal.completedAt),
        ),
      )
      .orderBy(asc(authorshipJournal.startedAt));
    const ids = journals.map((j) => j.id);
    const events = ids.length
      ? await this.db
          .select()
          .from(compositionEvent)
          .where(inArray(compositionEvent.journalId, ids))
          .orderBy(asc(compositionEvent.seq))
      : [];
    const trail = ids.length
      ? await this.db
          .select({ s: studyTrail, t: translation })
          .from(studyTrail)
          .leftJoin(translation, eq(translation.id, studyTrail.translationId))
          .where(inArray(studyTrail.journalId, ids))
      : [];
    return journals.map((j) => {
      const own = events.filter((e) => e.journalId === j.id).map(recorded);
      return {
        journal: j,
        events: own,
        trail: trail.filter(({ s }) => s.journalId === j.id),
        verified: verifyJournal({ ...header(j), text: j.text, headHash: j.headHash }, own),
      };
    });
  }

  private async reports(compilationId: string, entered: string) {
    return this.db
      .select({ r: similarityReport, t: translation })
      .from(similarityReport)
      .innerJoin(translation, eq(translation.id, similarityReport.translationId))
      .where(
        and(
          eq(similarityReport.compilationId, compilationId),
          eq(similarityReport.entered, entered),
        ),
      )
      .orderBy(desc(similarityReport.score), asc(translation.abbreviation));
  }

  private async declarations(compilationId: string, entered: string) {
    return this.db
      .select()
      .from(authorshipDeclaration)
      .where(
        and(
          eq(authorshipDeclaration.compilationId, compilationId),
          eq(authorshipDeclaration.entered, entered),
        ),
      )
      .orderBy(asc(authorshipDeclaration.declaredAt));
  }

  async summary(compilationId: string, entered: string, text: string): Promise<AuthorshipSummary> {
    const [journals, reports, declarations] = await Promise.all([
      this.journals(compilationId, entered),
      this.reports(compilationId, entered),
      this.declarations(compilationId, entered),
    ]);
    const hash = textHash(text);
    const declared = declarations.filter((d) => d.textHash === hash).at(-1);
    return {
      sessions: journals.length,
      events: journals.reduce((n, j) => n + j.events.length, 0),
      externalPastes: journals.reduce(
        (n, j) => n + j.events.filter((e) => e.pasteOrigin === "external").length,
        0,
      ),
      verified: journals.every((j) => j.verified),
      declaredAt: declared?.declaredAt.toISOString() ?? null,
      similarity: reports.map(({ r, t }) => ({
        translation: sourceView(t),
        score: r.score,
        matched: r.matched,
      })),
    };
  }

  /**
   * The evidence bundle for one verse (domain-model §2.3.1, "Evidence export"): every saved
   * session's events and trail, the similarity reports and the declarations, each journal
   * checked. Not yet signed or timestamped by an outside service.
   */
  async evidence(compilationId: string, entered: string) {
    const [journals, reports, declarations] = await Promise.all([
      this.journals(compilationId, entered),
      this.reports(compilationId, entered),
      this.declarations(compilationId, entered),
    ]);
    return {
      journals: journals.map(({ journal: j, events, trail, verified }) => ({
        id: j.id,
        startedAt: j.startedAt.toISOString(),
        completedAt: j.completedAt?.toISOString() ?? null,
        startText: j.startText,
        text: j.text,
        journalHash: journalHash(header(j)),
        headHash: j.headHash,
        verified,
        events: events.map((e) => ({ ...e, at: e.at.toISOString() })),
        trail: trail.map(({ s, t }) => ({
          at: s.at.toISOString(),
          resource: s.resource,
          translation: t ? sourceView(t) : null,
        })),
      })),
      similarity: reports.map(({ r, t }) => ({
        translation: sourceView(t),
        score: r.score,
        matched: r.matched,
        textHash: r.textHash,
        computedAt: r.computedAt.toISOString(),
      })),
      declarations: declarations.map((d) => ({
        statementVersion: d.statementVersion,
        textHash: d.textHash,
        journal: d.journalId,
        chainHead: d.chainHead,
        declaredAt: d.declaredAt.toISOString(),
      })),
    };
  }
}
