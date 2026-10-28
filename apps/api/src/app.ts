import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.ts";
import { type AccountSettings, accountSettingsFromEnv } from "./auth/config.ts";

export interface AppOptions {
  /** Tests pass their own database. */
  databaseUrl?: string;
  /** From the environment when not given; tests pass a memory store and a mail list. */
  accounts?: AccountSettings;
}

/** The API on Fastify, under `/api`. */
export async function createApp(options: AppOptions = {}): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.create(options.accounts ?? accountSettingsFromEnv(), options.databaseUrl),
    new FastifyAdapter(),
    { logger: ["error", "warn"] },
  );
  app.setGlobalPrefix("api");
  app.enableShutdownHooks();
  return app;
}
