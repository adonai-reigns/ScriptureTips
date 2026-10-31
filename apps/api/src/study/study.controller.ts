import { Body, Controller, Header, HttpCode, Inject, Post } from "@nestjs/common";
import { z } from "zod";
import { ZodPipe } from "../zod-pipe.ts";
import { StudyService, type StudyWord } from "./study.service.ts";

/** Strong's numbers as the verse text tags them: four digits (`H0430`). */
const Request = z.object({
  strongs: z.array(z.string().regex(/^[HG]\d{4}$/)).max(5000),
});

@Controller("study")
export class StudyController {
  constructor(@Inject(StudyService) private readonly study: StudyService) {}

  /**
   * How study mode draws each of these Strong's numbers: its category, and the word it is. A
   * POST because a chapter has hundreds of numbers; the answer is reference data, the same for
   * everyone.
   */
  @Post("words")
  @HttpCode(200)
  @Header("cache-control", "no-store")
  async words(
    @Body(new ZodPipe(Request)) body: z.infer<typeof Request>,
  ): Promise<{ words: Record<string, StudyWord> }> {
    return { words: await this.study.words([...new Set(body.strongs)]) };
  }
}
