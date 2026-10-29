import { type DynamicModule, Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.ts";
import type { AccountSettings } from "./auth/config.ts";
import { AuthorshipService } from "./compilations/authorship.service.ts";
import { CompilationsController } from "./compilations/compilations.controller.ts";
import { CompilationsService } from "./compilations/compilations.service.ts";
import { DatabaseModule } from "./database.ts";
import { TranslationsController } from "./translations/translations.controller.ts";
import { TranslationsService } from "./translations/translations.service.ts";

@Module({
  controllers: [TranslationsController, CompilationsController],
  providers: [TranslationsService, CompilationsService, AuthorshipService],
})
export class AppModule {
  /** The app on a database (`DATABASE_URL`, or the URL given), with its account settings. */
  static create(accounts: AccountSettings, databaseUrl?: string): DynamicModule {
    return {
      module: AppModule,
      imports: [DatabaseModule.forUrl(databaseUrl), AuthModule.forSettings(accounts)],
    };
  }
}
