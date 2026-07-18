import { ZodError, type ZodSchema } from "zod";

export class RequestValidationError extends Error {
  status = 400;
  issues: unknown;

  constructor(error: ZodError) {
    super("The request payload is invalid.");
    this.name = "RequestValidationError";
    this.issues = error.flatten();
  }
}

export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new RequestValidationError(result.error);
  }

  return result.data;
}
