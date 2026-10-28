import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  Inject,
  Put,
  UnauthorizedException,
} from "@nestjs/common";
import { CANON_IDS } from "@scripturetips/canon";
import { eq, user } from "@scripturetips/db";
import { z } from "zod";
import { DATABASE, type Database, isUniqueViolation } from "../database.ts";
import { ZodPipe } from "../zod-pipe.ts";
import type { Auth } from "./auth.ts";
import type { AccountSettings } from "./config.ts";
import { isReservedHandle, isReservedName } from "./reserved-handles.ts";
import { signedInUser, type User } from "./session.ts";
import { AUTH, SETTINGS } from "./tokens.ts";

/** `@handle` (domain-model §1.6): 3–30 ASCII letters, digits and hyphens, stored lowercase. */
export const Handle = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,28})[a-z0-9]$/)
  .refine((h) => !h.includes("--"));

const AccountUpdate = z
  .object({
    handle: Handle.optional(),
    /** Display name, in any script. */
    name: z.string().trim().min(1).max(60).optional(),
    /** Canon profile (vision §3.4): chosen after the first sign-in, changeable any time. */
    canon: z.enum(CANON_IDS).optional(),
  })
  .strict();

export interface AccountView {
  email: string;
  handle: string | null;
  name: string;
  locale: string;
  canon: string | null;
  trustLevel: number;
}

const view = (u: User): AccountView => ({
  email: u.email,
  handle: u.handle,
  name: u.name,
  locale: u.locale,
  canon: u.canon,
  trustLevel: u.trustLevel,
});

/** The signed-in user's account. Errors come back as codes; the UI words them. */
@Controller("account")
export class AccountController {
  constructor(
    @Inject(AUTH) private readonly auth: Auth,
    @Inject(SETTINGS) private readonly settings: AccountSettings,
    @Inject(DATABASE) private readonly db: Database,
  ) {}

  /** A bot-check puzzle for the sign-in form (the ALTCHA widget fetches it). */
  @Get("bot-check")
  challenge(): Promise<unknown> {
    return this.settings.botCheck.challenge();
  }

  @Get()
  async me(@Headers() headers: Record<string, string>): Promise<AccountView> {
    return view(await this.signedIn(headers));
  }

  /**
   * Sets the handle, display name and canon profile. A handle is chosen once for now: changing one comes with
   * the redirect and retirement rules (domain-model §1.6), when there is published content.
   */
  @Put()
  async update(
    @Headers() headers: Record<string, string>,
    @Body(new ZodPipe(AccountUpdate)) body: z.infer<typeof AccountUpdate>,
  ): Promise<AccountView> {
    const current = await this.signedIn(headers);
    if (body.handle !== undefined && body.handle !== current.handle) {
      if (current.handle !== null) throw new BadRequestException({ code: "handle-already-chosen" });
      if (isReservedHandle(body.handle)) throw new BadRequestException({ code: "handle-reserved" });
    }
    if (body.name !== undefined && body.name !== current.name && isReservedName(body.name))
      throw new BadRequestException({ code: "name-reserved" });
    try {
      const [updated] = await this.db
        .update(user)
        .set({
          ...(body.handle !== undefined ? { handle: body.handle } : {}),
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.canon !== undefined ? { canon: body.canon } : {}),
          updatedAt: new Date(),
        })
        .where(eq(user.id, current.id))
        .returning();
      if (!updated) throw new UnauthorizedException({ code: "signed-out" });
      return view(updated);
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException({ code: "handle-taken" });
      throw e;
    }
  }

  private signedIn(headers: Record<string, string>): Promise<User> {
    return signedInUser(this.auth, this.db, headers);
  }
}
