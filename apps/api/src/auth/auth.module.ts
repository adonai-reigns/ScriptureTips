import {
  type DynamicModule,
  Inject,
  Module,
  type OnApplicationShutdown,
  type OnModuleInit,
} from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { DATABASE, type Database } from "../database.ts";
import { AccountController } from "./account.controller.ts";
import { type Auth, createAuth } from "./auth.ts";
import type { AccountSettings } from "./config.ts";
import {
  AUTH,
  type FastifyReplyLike,
  type FastifyRequestLike,
  fetchHeaders,
  SETTINGS,
} from "./tokens.ts";

/** Accounts: Better Auth's endpoints under `/api/auth`, and our own under `/api/account`. */
@Module({ controllers: [AccountController] })
export class AuthModule implements OnModuleInit, OnApplicationShutdown {
  constructor(
    @Inject(AUTH) private readonly auth: Auth,
    @Inject(SETTINGS) private readonly settings: AccountSettings,
    @Inject(HttpAdapterHost) private readonly adapterHost: HttpAdapterHost,
  ) {}

  static forSettings(settings: AccountSettings): DynamicModule {
    return {
      module: AuthModule,
      providers: [
        { provide: SETTINGS, useValue: settings },
        {
          provide: AUTH,
          inject: [DATABASE],
          useFactory: (db: Database) => createAuth({ ...settings, db }),
        },
      ],
      exports: [AUTH, SETTINGS],
    };
  }

  /** Hands every `/api/auth/*` request to Better Auth, as a Fetch request. */
  onModuleInit(): void {
    const fastify = this.adapterHost.httpAdapter.getInstance();
    fastify.route({
      method: ["GET", "POST"],
      url: "/api/auth/*",
      handler: async (request: FastifyRequestLike, reply: FastifyReplyLike) => {
        const headers = fetchHeaders(request.headers);
        const url = new URL(request.url, `http://${headers.get("host") ?? "localhost"}`);
        const response = await this.auth.handler(
          new Request(url, {
            method: request.method,
            headers,
            ...(request.method === "POST" && request.body !== undefined
              ? { body: JSON.stringify(request.body) }
              : {}),
          }),
        );
        reply.status(response.status);
        response.headers.forEach((value, name) => {
          if (name !== "set-cookie") reply.header(name, value);
        });
        const cookies = response.headers.getSetCookie();
        if (cookies.length > 0) reply.header("set-cookie", cookies);
        return reply.send(response.body ? await response.text() : null);
      },
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.settings.store.close();
  }
}
