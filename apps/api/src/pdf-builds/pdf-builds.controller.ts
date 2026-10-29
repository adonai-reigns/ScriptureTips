import {
  Body,
  Controller,
  Get,
  Headers,
  Inject,
  Param,
  Post,
  StreamableFile,
} from "@nestjs/common";
import { BUILD_FILES, type BuildFile } from "@scripturetips/book";
import { z } from "zod";
import type { Auth } from "../auth/auth.ts";
import { signedInUser, type User } from "../auth/session.ts";
import { AUTH } from "../auth/tokens.ts";
import { DATABASE, type Database } from "../database.ts";
import { ZodPipe } from "../zod-pipe.ts";
import { type BuildView, PdfBuildsService } from "./pdf-builds.service.ts";

const Slug = z.string().regex(/^[a-z0-9]{2,12}$/i);
const BuildId = z.uuid();
const FileName = z.enum(Object.keys(BUILD_FILES) as [BuildFile, ...BuildFile[]]);

const NewBuild = z
  .object({
    /** Books or chapters to build ("Ruth"); the whole compilation when absent. */
    scope: z.string().trim().min(1).max(200).optional(),
  })
  .strict();

/**
 * PDF builds of the signed-in user's compilation (book-designer.md §8, §9): request one, follow
 * it, and download its files (the PDFs, `book.json` and the Typst sources). Errors come back as
 * codes.
 */
@Controller("compilations/:slug/pdf-builds")
export class PdfBuildsController {
  constructor(
    @Inject(AUTH) private readonly auth: Auth,
    @Inject(DATABASE) private readonly db: Database,
    @Inject(PdfBuildsService) private readonly builds: PdfBuildsService,
  ) {}

  @Get()
  async list(
    @Headers() headers: Record<string, string>,
    @Param("slug", new ZodPipe(Slug)) slug: string,
  ): Promise<{ builds: BuildView[] }> {
    return { builds: await this.builds.list(await this.user(headers), slug) };
  }

  @Post()
  async request(
    @Headers() headers: Record<string, string>,
    @Param("slug", new ZodPipe(Slug)) slug: string,
    @Body(new ZodPipe(NewBuild)) body: z.infer<typeof NewBuild>,
  ): Promise<{ build: BuildView }> {
    return { build: await this.builds.request(await this.user(headers), slug, body.scope) };
  }

  @Get(":id/:file")
  async file(
    @Headers() headers: Record<string, string>,
    @Param("slug", new ZodPipe(Slug)) slug: string,
    @Param("id", new ZodPipe(BuildId)) id: string,
    @Param("file", new ZodPipe(FileName)) name: BuildFile,
  ): Promise<StreamableFile> {
    const file = await this.builds.file(await this.user(headers), slug, id, name);
    return new StreamableFile(file.body, {
      type: file.contentType,
      length: file.size,
      disposition: `attachment; filename="${file.name}"`,
    });
  }

  private user(headers: Record<string, string>): Promise<User> {
    return signedInUser(this.auth, this.db, headers);
  }
}
