import type { Comment } from "@/lib/types";
import { sql } from "@/server/database/client";
import type { CreateCommentInput } from "./comments.validation";

function mapComment(row: Record<string, unknown>): Comment {
  return {
    id: String(row.id),
    item_id: String(row.item_id),
    user_id: String(row.user_id),
    user_name: String(row.user_name),
    user_color: String(row.user_color),
    text: String(row.text),
    parent_id: row.parent_id == null ? null : String(row.parent_id),
    position_x:
      row.position_x == null ? null : Number(row.position_x),
    position_y:
      row.position_y == null ? null : Number(row.position_y),
    resolved: Boolean(row.resolved),
    replies: [],
    created_at: Number(row.created_at),
  };
}

export async function findCommentsByItem(itemId: string): Promise<Comment[]> {
  const rows = await sql`
    SELECT *
    FROM comments
    WHERE item_id = ${itemId}
    ORDER BY created_at ASC
  `;
  return rows.map(row => mapComment(row));
}

export async function countRecentComments(
  userId: string,
  since: number,
): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int AS count
    FROM comments
    WHERE user_id = ${userId} AND created_at >= ${since}
  `;
  return Number(rows[0]?.count || 0);
}

export async function parentCommentExists(
  parentId: string,
  itemId: string,
): Promise<boolean> {
  const rows = await sql`
    SELECT id
    FROM comments
    WHERE id = ${parentId}
      AND item_id = ${itemId}
      AND parent_id IS NULL
    LIMIT 1
  `;
  return rows.length > 0;
}

export async function insertComment(
  input: CreateCommentInput,
): Promise<Comment> {
  const rows = await sql`
    INSERT INTO comments (
      id, item_id, user_id, user_name, user_color, text,
      parent_id, position_x, position_y, created_at
    )
    VALUES (
      ${crypto.randomUUID()}, ${input.itemId}, ${input.userId},
      ${input.userName}, ${input.userColor}, ${input.text},
      ${input.parentId}, ${input.x}, ${input.y}, ${Date.now()}
    )
    RETURNING *
  `;
  return mapComment(rows[0]);
}
