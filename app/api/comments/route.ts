import { NextRequest, NextResponse } from "next/server";
import {
  createComment,
  getCommentTree,
} from "@/server/comments/comments.service";
import { parseCreateComment } from "@/server/comments/comments.validation";
import { HttpError } from "@/server/http/http-error";
import { apiError, logRouteError } from "@/server/http/responses";
import { readJsonBody, requiredString } from "@/server/http/validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const itemId = requiredString(
    request.nextUrl.searchParams.get("itemId"),
    200,
  );
  if (!itemId) return apiError("A valid itemId is required", 400);

  try {
    return NextResponse.json({ comments: await getCommentTree(itemId) });
  } catch (error) {
    logRouteError("comments.list", error);
    return apiError("Unable to load comments", 500);
  }
}

export async function POST(request: NextRequest) {
  const body = await readJsonBody(request);
  if (!body.ok) return apiError(body.error, 400);

  const input = parseCreateComment(body.data);
  if (!input.ok) return apiError(input.error, 400);

  try {
    return NextResponse.json(
      { comment: await createComment(input.data) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return apiError(error.message, error.status);
    }
    logRouteError("comments.create", error);
    return apiError("Unable to save comment", 500);
  }
}
