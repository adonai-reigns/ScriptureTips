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
import { isCountryCode } from "@scripturetips/countries";
import { countryClaim, eq, user } from "@scripturetips/db";
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

const AGE_BRACKETS = ["child", "teen", "adult", "senior"] as const;

const AccountUpdate = z
  .object({
    handle: Handle.optional(),
    /** Display name, in any script. */
    name: z.string().trim().min(1).max(60).optional(),
    /** Canon profile (vision §3.4): chosen after the first sign-in, changeable any time. */
    canon: z.enum(CANON_IDS).optional(),
    /** The country: a code from `@scripturetips/countries`, or null to clear it. */
    country: z.string().nullable().optional(),
    /**
     * Optional, and null clears it: nobody is stopped from withdrawing it. Interaction with other
     * members is restricted while it's unset (social features, not built yet), so others aren't left
     * unsure who they're dealing with.
     */
    gender: z.enum(["female", "male", "both"]).nullable().optional(),
    /** Optional; null clears it. */
    ageBracket: z.enum(AGE_BRACKETS).nullable().optional(),
    /**
     * A country the person says isn't on the list, in their words. Kept for review and shown to
     * no one until it has been (the review isn't built yet).
     */
    countryNotListed: z.string().trim().min(2).max(100).optional(),
  })
  .strict();

export interface AccountView {
  email: string;
  handle: string | null;
  name: string;
  locale: string;
  canon: string | null;
  trustLevel: number;
  /** A country code, or null. */
  country: string | null;
  /** `female`, `male`, `both`, or null. */
  gender: string | null;
  /** An age bracket, or null. */
  ageBracket: string | null;
  /** What they wrote when their country wasn't listed, until it's reviewed; only they see it. */
  countryClaim: string | null;
}

const view = (u: User, claim: string | null): AccountView => ({
  email: u.email,
  handle: u.handle,
  name: u.name,
  locale: u.locale,
  canon: u.canon,
  trustLevel: u.trustLevel,
  country: u.country,
  gender: u.gender,
  ageBracket: u.ageBracket,
  countryClaim: claim,
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
    const current = await this.signedIn(headers);
    return view(current, await this.claimOf(current.id));
  }

  /**
   * Sets the handle, display name, canon profile and country. A handle is chosen once for now: changing one comes with
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
    if (body.country != null && !isCountryCode(body.country))
      throw new BadRequestException({ code: "country-invalid" });
    if (body.country != null && body.countryNotListed !== undefined)
      throw new BadRequestException({ code: "country-invalid" });
    try {
      const [updated] = await this.db
        .update(user)
        .set({
          ...(body.handle !== undefined ? { handle: body.handle } : {}),
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.canon !== undefined ? { canon: body.canon } : {}),
          ...(body.gender !== undefined ? { gender: body.gender } : {}),
          ...(body.ageBracket !== undefined ? { ageBracket: body.ageBracket } : {}),
          // Saying the country isn't listed clears the one set; choosing one drops the claim.
          ...(body.country !== undefined ? { country: body.country } : {}),
          ...(body.countryNotListed !== undefined ? { country: null } : {}),
          updatedAt: new Date(),
        })
        .where(eq(user.id, current.id))
        .returning();
      if (!updated) throw new UnauthorizedException({ code: "signed-out" });
      if (body.countryNotListed !== undefined) {
        await this.db
          .insert(countryClaim)
          .values({ userId: current.id, name: body.countryNotListed })
          .onConflictDoUpdate({
            target: countryClaim.userId,
            set: { name: body.countryNotListed, status: "pending", updatedAt: new Date() },
          });
      } else if (body.country != null) {
        await this.db.delete(countryClaim).where(eq(countryClaim.userId, current.id));
      }
      return view(updated, await this.claimOf(current.id));
    } catch (e) {
      if (isUniqueViolation(e)) throw new ConflictException({ code: "handle-taken" });
      throw e;
    }
  }

  /** What the person wrote when their country wasn't listed, while it's waiting for review. */
  private async claimOf(userId: string): Promise<string | null> {
    const [claim] = await this.db
      .select({ name: countryClaim.name })
      .from(countryClaim)
      .where(eq(countryClaim.userId, userId));
    return claim?.name ?? null;
  }

  private signedIn(headers: Record<string, string>): Promise<User> {
    return signedInUser(this.auth, this.db, headers);
  }
}
