import { NextResponse } from "next/server";

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function logRouteError(scope: string, error: unknown) {
  console.error(
    JSON.stringify({
      event: "api_request_failed",
      scope,
      error: error instanceof Error ? error.message : String(error),
    }),
  );
}
