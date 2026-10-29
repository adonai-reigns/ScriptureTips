import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { z } from "zod";
import type { Auth } from "../auth/auth.ts";
import { signedInUser, type User } from "../auth/session.ts";
import { AUTH, type FastifyReplyLike } from "../auth/tokens.ts";
import { DATABASE, type Database } from "../database.ts";
import { ZodPipe } from "../zod-pipe.ts";
import { MAX_TEXT } from "./authorship.service.ts";
import {
  type CompilationSummary,
  CompilationsService,
  type CompilationView,
  SECTIONS,
  type VerseChoiceView,
  type VerseEditorView,
} from "./compilations.service.ts";
import { MAX_NOTE, type NoteEditView } from "./notes.ts";

const Slug = z.string().regex(/^[a-z0-9]{2,12}$/i);
const TranslationId = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/);

const NewCompilation = z
  .object({
    title: z.string().trim().min(1).max(100),
    /** 2–12 letters and digits; its lowercase form is the compilation's path segment. */
    abbreviation: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9]{2,12}$/),
    base: TranslationId,
  })
  .strict();

const NewRule = z
  .object({
    scope: z.union([
      z.object({ section: z.enum(SECTIONS) }).strict(),
      z.object({ reference: z.string().trim().min(1).max(200) }).strict(),
    ]),
    source: TranslationId,
  })
  .strict();

const PassageQuery = z.object({ ref: z.string().trim().min(1).max(200) });

/**
 * A single verse taken from `source`; with `text`, that source's wording edited. Or, with
 * `journal`, the wording that journal recorded, declared the user's own with `declaration`
 * (the statement version they were shown).
 */
const VerseChoice = z
  .object({
    reference: z.string().trim().min(1).max(200),
    source: TranslationId.optional(),
    text: z.string().trim().min(1).max(MAX_TEXT).optional(),
    kind: z.enum(["correction", "adaptation"]).optional(),
    changeNote: z.string().trim().max(1000).optional(),
    journal: z.uuid().optional(),
    declaration: z.number().int().positive().optional(),
  })
  .strict()
  .refine((v) => (v.source === undefined) !== (v.journal === undefined));

const NewJournal = z.object({ reference: z.string().trim().min(1).max(200) }).strict();

/** A burst of writing in the editor: at `position`, `removed` became `inserted`. */
const JournalEvents = z
  .object({
    events: z
      .array(
        z
          .object({
            kind: z.enum(["insert", "delete", "replace", "paste", "undo", "redo"]),
            position: z.number().int().min(0).max(MAX_TEXT),
            removed: z.string().max(MAX_TEXT),
            inserted: z.string().max(MAX_TEXT),
            elapsed: z.number().int().min(0).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(200),
  })
  .strict();

const Declaration = z.object({ statement: z.number().int().positive() }).strict();

const NoteWording = z.string().trim().min(1).max(MAX_NOTE);
const After = z.number().int().min(0).max(MAX_TEXT);

/**
 * A change to one of a verse's translator's notes: `add` an own note after the verse's word
 * `after`; or, for the note at `position`, new `text` (and `after`, for an own note), `removed`,
 * or `restore` the source's note. One change at a time.
 */
const NoteChangeSchema = z.union([
  z.object({ add: z.object({ text: NoteWording, after: After }).strict() }).strict(),
  z
    .object({
      position: z.number().int().min(0),
      text: NoteWording.optional(),
      after: After.optional(),
      removed: z.literal(true).optional(),
      restore: z.literal(true).optional(),
    })
    .strict()
    .refine(
      (c) =>
        [c.text !== undefined || c.after !== undefined, c.removed, c.restore].filter(Boolean)
          .length === 1,
    ),
]);

const NoteRequest = z
  .object({ reference: z.string().trim().min(1).max(200), change: NoteChangeSchema })
  .strict();

/** The signed-in user's compilations (domain-model §2.3). Errors come back as codes. */
@Controller("compilations")
export class CompilationsController {
  constructor(
    @Inject(AUTH) private readonly auth: Auth,
    @Inject(DATABASE) private readonly db: Database,
    @Inject(CompilationsService) private readonly compilations: CompilationsService,
  ) {}

  @Get()
  async list(
    @Headers() headers: Record<string, string>,
  ): Promise<{ compilations: CompilationSummary[] }> {
    return { compilations: await this.compilations.list(await this.user(headers)) };
  }

  @Post()
  async create(
    @Headers() headers: Record<string, string>,
    @Body(new ZodPipe(NewCompilation)) body: z.infer<typeof NewCompilation>,
  ): Promise<CompilationView> {
    return this.compilations.create(await this.user(headers), body);
  }

  @Get(":slug")
  async view(
    @Headers() headers: Record<string, string>,
    @Param("slug", new ZodPipe(Slug)) slug: string,
  ): Promise<CompilationView> {
    return this.compilations.view(await this.user(headers), slug);
  }

  @Delete(":slug")
  @HttpCode(204)
  async remove(
    @Headers() headers: Record<string, string>,
    @Param("slug", new ZodPipe(Slug)) slug: string,
  ): Promise<void> {
    await this.compilations.remove(await this.user(headers), slug);
  }

  @Post(":slug/rules")
  async addRule(
    @Headers() headers: Record<string, string>,
    @Param("slug", new ZodPipe(Slug)) slug: string,
    @Body(new ZodPipe(NewRule)) body: z.infer<typeof NewRule>,
  ): Promise<CompilationView> {
    return this.compilations.addRule(await this.user(headers), slug, body);
  }

  @Delete(":slug/rules/:rule")
  async removeRule(
    @Headers() headers: Record<string, string>,
    @Param("slug", new ZodPipe(Slug)) slug: string,
    @Param("rule", new ZodPipe(z.uuid())) rule: string,
  ): Promise<CompilationView> {
    return this.compilations.removeRule(await this.user(headers), slug, rule);
  }

  /** The verse editor's view of one verse: `?ref=Genesis 1:3`. */
  @Get(":slug/verses")
  async verse(
    @Headers() headers: Record<string, string>,
    @Param("slug", new ZodPipe(Slug)) slug: string,
    @Query(new ZodPipe(PassageQuery)) query: z.infer<typeof PassageQuery>,
  ): Promise<VerseEditorView> {
    return this.compilations.verse(await this.user(headers), slug, query.ref);
  }

  @Post(":slug/verses")
  async saveVerse(
    @Headers() headers: Record<string, string>,
    @Param("slug", new ZodPipe(Slug)) slug: string,
    @Body(new ZodPipe(VerseChoice)) body: z.infer<typeof VerseChoice>,
  ): Promise<{ choice: VerseChoiceView; changes: number }> {
    return this.compilations.saveVerse(await this.user(headers), slug, body);
  }

  /** Starts a session of writing the user's own rendering (domain-model §2.3.1). */
  @Post(":slug/journals")
  async startJournal(
    @Headers() headers: Record<string, string>,
    @Param("slug", new ZodPipe(Slug)) slug: string,
    @Body(new ZodPipe(NewJournal)) body: z.infer<typeof NewJournal>,
  ): Promise<{ id: string; text: string }> {
    return this.compilations.startJournal(await this.user(headers), slug, body.reference);
  }

  @Post(":slug/journals/:journal/events")
  @HttpCode(200)
  async recordEvents(
    @Headers() headers: Record<string, string>,
    @Param("slug", new ZodPipe(Slug)) slug: string,
    @Param("journal", new ZodPipe(z.uuid())) journal: string,
    @Body(new ZodPipe(JournalEvents)) body: z.infer<typeof JournalEvents>,
  ): Promise<{ events: number; length: number }> {
    return this.compilations.recordEvents(await this.user(headers), slug, journal, body.events);
  }

  /** Declares a pasted rendering the user's own. */
  @Post(":slug/verses/:verse/declaration")
  @HttpCode(200)
  async declareVerse(
    @Headers() headers: Record<string, string>,
    @Param("slug", new ZodPipe(Slug)) slug: string,
    @Param("verse", new ZodPipe(z.uuid())) verse: string,
    @Body(new ZodPipe(Declaration)) body: z.infer<typeof Declaration>,
  ): Promise<{ choice: VerseChoiceView }> {
    return {
      choice: await this.compilations.declareVerse(
        await this.user(headers),
        slug,
        verse,
        body.statement,
      ),
    };
  }

  /**
   * Changes one of a verse's translator's notes (editing the verse if it was taken unchanged);
   * returns the verse's notes as they are now.
   */
  @Post(":slug/notes")
  @HttpCode(200)
  async changeNote(
    @Headers() headers: Record<string, string>,
    @Param("slug", new ZodPipe(Slug)) slug: string,
    @Body(new ZodPipe(NoteRequest)) body: z.infer<typeof NoteRequest>,
  ): Promise<{ notes: NoteEditView[] }> {
    return {
      notes: await this.compilations.changeNote(
        await this.user(headers),
        slug,
        body.reference,
        body.change,
      ),
    };
  }

  /** An own rendering's evidence bundle, as a file to keep. */
  @Get(":slug/verses/:verse/evidence")
  async evidence(
    @Headers() headers: Record<string, string>,
    @Param("slug", new ZodPipe(Slug)) slug: string,
    @Param("verse", new ZodPipe(z.uuid())) verse: string,
    @Res({ passthrough: true }) reply: FastifyReplyLike,
  ): Promise<unknown> {
    const bundle = await this.compilations.evidence(await this.user(headers), slug, verse);
    const name = `evidence-${slug.toLowerCase()}-${bundle.verse.entered}.json`;
    reply.header("content-disposition", `attachment; filename="${name}"`);
    return bundle;
  }

  @Delete(":slug/verses/:verse")
  async removeVerse(
    @Headers() headers: Record<string, string>,
    @Param("slug", new ZodPipe(Slug)) slug: string,
    @Param("verse", new ZodPipe(z.uuid())) verse: string,
  ): Promise<CompilationView> {
    return this.compilations.removeVerse(await this.user(headers), slug, verse);
  }

  @Get(":slug/books")
  async books(
    @Headers() headers: Record<string, string>,
    @Param("slug", new ZodPipe(Slug)) slug: string,
  ): Promise<{ books: unknown[] }> {
    return { books: await this.compilations.books(await this.user(headers), slug) };
  }

  /** A passage, read like a translation's: `?ref=Genesis 1`. Each verse names its source. */
  @Get(":slug/passages")
  async passage(
    @Headers() headers: Record<string, string>,
    @Param("slug", new ZodPipe(Slug)) slug: string,
    @Query(new ZodPipe(PassageQuery)) query: z.infer<typeof PassageQuery>,
  ): Promise<unknown> {
    return this.compilations.passage(await this.user(headers), slug, query.ref);
  }

  private user(headers: Record<string, string>): Promise<User> {
    return signedInUser(this.auth, this.db, headers);
  }
}
