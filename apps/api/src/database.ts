import { Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { connect, type Database, databaseUrl } from "@scripturetips/db";

/** Injection token for the Drizzle handle (`@Inject(DATABASE)`). */
export const DATABASE = Symbol("database");
const CLOSE = Symbol("close database");

/** Opens the pool on `DATABASE_URL`, or the URL given (tests), and closes it on shutdown. */
@Module({})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(CLOSE) private readonly close: () => Promise<void>) {}

  static forUrl(url: string = databaseUrl()) {
    const { db, close } = connect(url);
    return {
      module: DatabaseModule,
      global: true,
      providers: [
        { provide: DATABASE, useValue: db },
        { provide: CLOSE, useValue: close },
      ],
      exports: [DATABASE],
    };
  }

  async onApplicationShutdown(): Promise<void> {
    await this.close();
  }
}

export type { Database };

/** True for PostgreSQL's unique-constraint error (23505), as Drizzle wraps it or not. */
export const isUniqueViolation = (e: unknown): boolean => {
  const cause = (e as { cause?: { code?: string }; code?: string }) ?? {};
  return cause.code === "23505" || cause.cause?.code === "23505";
};
