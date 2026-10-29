import { type DynamicModule, Inject, Module, type OnApplicationShutdown } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.ts";
import type { AccountSettings } from "./auth/config.ts";
import { AuthorshipService } from "./compilations/authorship.service.ts";
import { CompilationsController } from "./compilations/compilations.controller.ts";
import { CompilationsService } from "./compilations/compilations.service.ts";
import { DatabaseModule } from "./database.ts";
import { PdfBuildsController } from "./pdf-builds/pdf-builds.controller.ts";
import { BUILD_SETTINGS, PdfBuildsService } from "./pdf-builds/pdf-builds.service.ts";
import type { BuildSettings } from "./pdf-builds/settings.ts";
import { PublicationsController } from "./publications/publications.controller.ts";
import { PublicationsService } from "./publications/publications.service.ts";
import { TranslationsController } from "./translations/translations.controller.ts";
import { TranslationsService } from "./translations/translations.service.ts";

@Module({
  controllers: [
    TranslationsController,
    CompilationsController,
    PublicationsController,
    PdfBuildsController,
  ],
  providers: [
    TranslationsService,
    CompilationsService,
    AuthorshipService,
    PublicationsService,
    PdfBuildsService,
  ],
})
export class AppModule implements OnApplicationShutdown {
  constructor(@Inject(BUILD_SETTINGS) private readonly builds: BuildSettings) {}

  /**
   * The app on a database (`DATABASE_URL`, or the URL given), with its account and PDF build
   * settings.
   */
  static create(
    accounts: AccountSettings,
    builds: BuildSettings,
    databaseUrl?: string,
  ): DynamicModule {
    return {
      module: AppModule,
      imports: [DatabaseModule.forUrl(databaseUrl), AuthModule.forSettings(accounts)],
      providers: [{ provide: BUILD_SETTINGS, useValue: builds }],
    };
  }

  async onApplicationShutdown(): Promise<void> {
    await this.builds.queue.close();
  }
}
