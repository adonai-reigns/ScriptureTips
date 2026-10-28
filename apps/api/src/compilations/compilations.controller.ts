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
} from "@nestjs/common";
import { z } from "zod";
import type { Auth } from "../auth/auth.ts";
import { signedInUser, type User } from "../auth/session.ts";
import { AUTH } from "../auth/tokens.ts";
import { DATABASE, type Database } from "../database.ts";
import { ZodPipe } from "../zod-pipe.ts";
import {
  type CompilationSummary,
  CompilationsService,
  type CompilationView,
  SECTIONS,
  type VerseChoiceView,
  type VerseEditorView,
} from "./compilations.service.ts";

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

/** A single verse taken from `source`; with `text`, that source's wording edited. */
const VerseChoice = z
  .object({
    reference: z.string().trim().min(1).max(200),
    source: TranslationId,
    text: z.string().trim().min(1).max(5000).optional(),
    kind: z.enum(["correction", "adaptation"]).optional(),
    changeNote: z.string().trim().max(1000).optional(),
  })
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
  ): Promise<{ choice: VerseChoiceView; wordsChanged: number }> {
    return this.compilations.saveVerse(await this.user(headers), slug, body);
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
