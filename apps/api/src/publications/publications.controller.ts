import {
  Body,
  Controller,
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
  PublicationsService,
  type PublicationView,
  type PublishCheck,
  type PublishingView,
} from "./publications.service.ts";

const Slug = z.string().regex(/^[a-z0-9]{2,12}$/i);
const Handle = z.string().regex(/^[A-Za-z0-9-]{3,30}$/);
const VersionId = z.string().regex(/^[A-Za-z0-9]{10}$/);

const Publish = z
  .object({
    visibility: z.enum(["unlisted", "public"]),
    /** The consent statement version the user accepted (domain-model §1.4, step 3). */
    consent: z.number().int().positive(),
    changeNote: z.string().trim().max(1000).optional(),
  })
  .strict();

const ReadQuery = z.object({ version: VersionId.optional() });
const PassageQuery = z.object({
  ref: z.string().trim().min(1).max(200),
  version: VersionId.optional(),
});

/**
 * Publications (domain-model §2.3): publishing the signed-in user's compilation, and reading
 * published versions, which needs no account. Errors come back as codes.
 */
@Controller()
export class PublicationsController {
  constructor(
    @Inject(AUTH) private readonly auth: Auth,
    @Inject(DATABASE) private readonly db: Database,
    @Inject(PublicationsService) private readonly publications: PublicationsService,
  ) {}

  /** The compilation's publication (null if not published) and recent requests, for its owner. */
  @Get("compilations/:slug/publication")
  async ofCompilation(
    @Headers() headers: Record<string, string>,
    @Param("slug", new ZodPipe(Slug)) slug: string,
  ): Promise<PublishingView> {
    return this.publications.ofCompilation(await this.user(headers), slug);
  }

  /** The pre-publish checks for the compilation as it is now (domain-model §1.4, step 2). */
  @Get("compilations/:slug/publication/check")
  async check(
    @Headers() headers: Record<string, string>,
    @Param("slug", new ZodPipe(Slug)) slug: string,
  ): Promise<PublishCheck> {
    return this.publications.check(await this.user(headers), slug);
  }

  /** Publishes the compilation as its next version. */
  @Post("compilations/:slug/publication")
  @HttpCode(200)
  async publish(
    @Headers() headers: Record<string, string>,
    @Param("slug", new ZodPipe(Slug)) slug: string,
    @Body(new ZodPipe(Publish)) body: z.infer<typeof Publish>,
  ): Promise<{ publication: PublicationView }> {
    return {
      publication: await this.publications.publish(await this.user(headers), slug, body),
    };
  }

  /** A version's books: the latest (if public), or the pinned `?version=`. */
  @Get("publications/:handle/:slug/books")
  books(
    @Param("handle", new ZodPipe(Handle)) handle: string,
    @Param("slug", new ZodPipe(Slug)) slug: string,
    @Query(new ZodPipe(ReadQuery)) query: z.infer<typeof ReadQuery>,
  ) {
    return this.publications.books(handle, slug, query.version);
  }

  /** A passage of a version, like a translation's: `?ref=Genesis 1[&version=…]`. */
  @Get("publications/:handle/:slug/passages")
  passage(
    @Param("handle", new ZodPipe(Handle)) handle: string,
    @Param("slug", new ZodPipe(Slug)) slug: string,
    @Query(new ZodPipe(PassageQuery)) query: z.infer<typeof PassageQuery>,
  ) {
    return this.publications.passage(handle, slug, query.ref, query.version);
  }

  private user(headers: Record<string, string>): Promise<User> {
    return signedInUser(this.auth, this.db, headers);
  }
}
