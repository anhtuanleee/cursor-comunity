import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_BOARD_ID } from "@/server/board/board.constants";
import {
  listBoardItems,
  upsertBoardItem,
} from "@/server/board/board.repository";
import { parseBoardItemUpdate } from "@/server/board/board.validation";
import { apiError, logRouteError } from "@/server/http/responses";
import { readJsonBody } from "@/server/http/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({
      boardId: DEFAULT_BOARD_ID,
      items: await listBoardItems(),
    });
  } catch (error) {
    logRouteError("board.list", error);
    return apiError("Unable to load shortlist", 500);
  }
}

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  if (!body.ok) return apiError(body.error, 400);

  const input = parseBoardItemUpdate(body.data);
  if (!input.ok) return apiError(input.error, 400);

  try {
    return NextResponse.json({
      mutation: await upsertBoardItem(input.data),
    });
  } catch (error) {
    logRouteError("board.update", error);
    return apiError("Unable to update shortlist", 500);
  }
}
