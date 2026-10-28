import { type DynamicModule, Module } from "@nestjs/common";
import { DatabaseModule } from "./database.ts";
import { TranslationsController } from "./translations/translations.controller.ts";
import { TranslationsService } from "./translations/translations.service.ts";

@Module({
  controllers: [TranslationsController],
  providers: [TranslationsService],
})
export class AppModule {
  /** The app on a database: `DATABASE_URL`, or the URL given (tests). */
  static forDatabase(url?: string): DynamicModule {
    return { module: AppModule, imports: [DatabaseModule.forUrl(url)] };
  }
}
