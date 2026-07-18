import { NextResponse } from "next/server";

import { AuthorizationError } from "@/lib/auth/authorize";
import { AuthenticationError } from "@/lib/middleware/withAuth";
import { RequestValidationError } from "@/lib/validation/parse";
import { InvalidTransitionError } from "@/lib/workflow/caseWorkflow";
import { NotFoundError } from "@/lib/errors";

export function handleRouteError(error: unknown) {
  if (
    error instanceof AuthenticationError ||
    error instanceof AuthorizationError ||
    error instanceof RequestValidationError ||
    error instanceof InvalidTransitionError ||
    error instanceof NotFoundError
  ) {
    return NextResponse.json(
      {
        error: {
          message: error.message,
          details: "issues" in error ? error.issues : undefined,
        },
      },
      { status: error.status },
    );
  }

  console.error(error);

  return NextResponse.json(
    {
      error: {
        message: "An unexpected server error occurred.",
      },
    },
    { status: 500 },
  );
}
