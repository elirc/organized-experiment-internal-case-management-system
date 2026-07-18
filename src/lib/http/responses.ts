import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function errorResponse(status: number, message: string, details?: unknown) {
  return NextResponse.json(
    {
      error: {
        message,
        details,
      },
    },
    { status },
  );
}
