import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { syncCreativeSources } from "../../../../partykit/ingestion/creative-feed/sync";
import { syncRecentItems } from "../../../../partykit/ingestion/recent/sync";

export const runtime = "nodejs";
export const maxDuration = 60;

const SOURCES = new Set(["recent", "creative"]);

function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.INGEST_CRON_SECRET;
  const received = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!expected || !received) return false;

  const expectedBytes = new TextEncoder().encode(expected);
  const receivedBytes = new TextEncoder().encode(received);
  return (
    expectedBytes.byteLength === receivedBytes.byteLength &&
    timingSafeEqual(expectedBytes, receivedBytes)
  );
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const source = request.nextUrl.searchParams.get("source");
  if (!source || !SOURCES.has(source)) {
    return NextResponse.json(
      { error: "source must be recent, creative, or x" },
      { status: 400 },
    );
  }

  const env = {
    DATABASE_URL: process.env.DATABASE_URL ?? "",
    CREATIVE_FEEDS: process.env.CREATIVE_FEEDS ?? "",
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
    GEMINI_MODEL: process.env.GEMINI_MODEL ?? "",
  };

  const result = source === "recent"
    ? await syncRecentItems(env)
    : await syncCreativeSources(env);

  return NextResponse.json({ source, result });
}
