import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { Comment } from "@/lib/types";

const MAX_COMMENT_LENGTH = 2_000;
const MAX_NAME_LENGTH = 80;

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isString(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function isColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

export async function GET(req: NextRequest) {
  const itemId = req.nextUrl.searchParams.get("itemId");
  if (!isString(itemId, 200)) return errorResponse("A valid itemId is required", 400);

  try {
    const rows = await sql`
      SELECT *
      FROM comments
      WHERE item_id = ${itemId}
      ORDER BY created_at ASC
    `;

    const topLevel: Comment[] = [];
    const byId = new Map<string, Comment>();

    for (const row of rows) {
      const comment = {
        ...row,
        resolved: Boolean(row.resolved),
        replies: [],
      } as unknown as Comment;
      byId.set(comment.id, comment);
      if (!comment.parent_id) topLevel.push(comment);
    }

    for (const comment of byId.values()) {
      if (!comment.parent_id) continue;
      byId.get(comment.parent_id)?.replies?.push(comment);
    }

    topLevel.sort((a, b) => b.created_at - a.created_at);
    return NextResponse.json({ comments: topLevel });
  } catch (error) {
    console.error("[comments] GET failed", error);
    return errorResponse("Unable to load comments", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const { itemId, userId, userName, userColor, parentId } = body;
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!isString(itemId, 200)) return errorResponse("Invalid itemId", 400);
    if (!isString(userId, 200)) return errorResponse("Invalid userId", 400);
    if (!isString(userName, MAX_NAME_LENGTH)) return errorResponse("Invalid userName", 400);
    if (!isColor(userColor)) return errorResponse("Invalid userColor", 400);
    if (!isString(text, MAX_COMMENT_LENGTH)) return errorResponse("Comment must be between 1 and 2000 characters", 400);
    if (parentId != null && !isString(parentId, 200)) return errorResponse("Invalid parentId", 400);

    const recentComments = await sql`
      SELECT COUNT(*)::int AS count
      FROM comments
      WHERE user_id = ${userId} AND created_at >= ${Date.now() - 60_000}
    `;
    if (Number(recentComments[0]?.count || 0) >= 10) {
      return errorResponse("Too many comments. Please wait a minute.", 429);
    }

    if (parentId) {
      const parents = await sql`
        SELECT id
        FROM comments
        WHERE id = ${parentId} AND item_id = ${itemId} AND parent_id IS NULL
        LIMIT 1
      `;
      if (parents.length === 0) return errorResponse("Parent comment not found", 404);
    }

    const id = crypto.randomUUID();
    const now = Date.now();
    const x = typeof body.x === "number" && Number.isFinite(body.x) ? body.x : null;
    const y = typeof body.y === "number" && Number.isFinite(body.y) ? body.y : null;

    const rows = await sql`
      INSERT INTO comments (
        id, item_id, user_id, user_name, user_color, text,
        parent_id, position_x, position_y, created_at
      )
      VALUES (
        ${id}, ${itemId}, ${userId}, ${userName.trim()}, ${userColor},
        ${text}, ${parentId ?? null}, ${x}, ${y}, ${now}
      )
      RETURNING *
    `;

    const comment = {
      ...rows[0],
      resolved: Boolean(rows[0].resolved),
      replies: [],
    } as unknown as Comment;
    return NextResponse.json({ comment }, { status: 201 });
  } catch (error) {
    console.error("[comments] POST failed", error);
    return errorResponse("Unable to save comment", 500);
  }
}
