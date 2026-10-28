import { BadRequestException, type PipeTransform } from "@nestjs/common";
import type { z } from "zod";

/** Validates a parameter or query with a Zod schema: `@Query(new ZodPipe(schema))`. */
export class ZodPipe<T extends z.ZodType> implements PipeTransform<unknown, z.infer<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: "invalid-request",
        issues: result.error.issues.map((i) => ({ path: i.path, code: i.code })),
      });
    }
    return result.data;
  }
}
