import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module.ts";

/** The API on Fastify, under `/api`. `databaseUrl`: tests pass their own database. */
export async function createApp(databaseUrl?: string): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.forDatabase(databaseUrl),
    new FastifyAdapter(),
    { logger: ["error", "warn"] },
  );
  app.setGlobalPrefix("api");
  app.enableShutdownHooks();
  return app;
}
