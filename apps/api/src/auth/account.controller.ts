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
import { eq, user } from "@scripturetips/db";
import { z } from "zod";
import { DATABASE, type Database } from "../database.ts";
import { ZodPipe } from "../zod-pipe.ts";
import type { Auth } from "./auth.ts";
import type { AccountSettings } from "./config.ts";
import { isReservedHandle, isReservedName } from "./reserved-handles.ts";
import { AUTH, fetchHeaders, SETTINGS } from "./tokens.ts";

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
  })
  .strict();

export interface AccountView {
  email: string;
  handle: string | null;
  name: string;
  locale: string;
  trustLevel: number;
}

const view = (u: typeof user.$inferSelect): AccountView => ({
  email: u.email,
  handle: u.handle,
  name: u.name,
  locale: u.locale,
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
   * Sets the handle and display name. A handle is chosen once for now: changing one comes with
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

  private async signedIn(headers: Record<string, string>): Promise<typeof user.$inferSelect> {
    const found = await this.auth.api.getSession({ headers: fetchHeaders(headers) });
    if (!found) throw new UnauthorizedException({ code: "signed-out" });
    const [row] = await this.db.select().from(user).where(eq(user.id, found.user.id));
    if (!row) throw new UnauthorizedException({ code: "signed-out" });
    return row;
  }
}

const isUniqueViolation = (e: unknown): boolean => {
  const cause = (e as { cause?: { code?: string }; code?: string }) ?? {};
  return cause.code === "23505" || cause.cause?.code === "23505";
};
