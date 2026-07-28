import { NextRequest, NextResponse } from "next/server";
import {
  listReactionCounts,
  listUserReactions,
  toggleReaction,
} from "@/server/reactions/reactions.repository";
import { parseReactionToggle } from "@/server/reactions/reactions.validation";
import { apiError, logRouteError } from "@/server/http/responses";
import { readJsonBody } from "@/server/http/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    const [counts, active] = await Promise.all([
      listReactionCounts(),
      userId ? listUserReactions(userId) : Promise.resolve([]),
    ]);
    return NextResponse.json({ counts, active });
  } catch (error) {
    logRouteError("reactions.list", error);
    return apiError("Unable to load reactions", 500);
  }
}

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  if (!body.ok) return apiError(body.error, 400);

  const input = parseReactionToggle(body.data);
  if (!input.ok) return apiError(input.error, 400);

  try {
    return NextResponse.json(await toggleReaction(input.data));
  } catch (error) {
    logRouteError("reactions.toggle", error);
    return apiError("Unable to save reaction", 500);
  }
}
