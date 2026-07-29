import type { BoardEntry, BoardLane, BoardMutation } from "@/lib/types";
import { galleryMediaUrl, galleryOutboundUrl } from "@/lib/media-routes";
import { sql } from "@/server/database/client";
import { DEFAULT_BOARD_ID } from "./board.constants";
import type { UpdateBoardItemInput } from "./board.validation";

function toLane(value: unknown): BoardLane {
  if (value === "keep" || value === "reject") return value;
  return "maybe";
}

export async function listBoardItems(): Promise<BoardEntry[]> {
  const rows = await sql`
    SELECT
      bi.board_id,
      bi.item_id,
      bi.lane,
      bi.reason,
      bi.position,
      bi.updated_by,
      bi.updated_by_name,
      bi.updated_by_color,
      bi.updated_at,
      i.title,
      i.cover_url,
      i.source_url
    FROM board_items bi
    INNER JOIN items i ON i.id = bi.item_id
    WHERE bi.board_id = ${DEFAULT_BOARD_ID}
    ORDER BY bi.lane, bi.position, bi.updated_at DESC
  `;

  return rows.map(row => ({
    boardId: String(row.board_id),
    itemId: String(row.item_id),
    lane: toLane(row.lane),
    reason: String(row.reason || ""),
    position: Number(row.position),
    updatedBy: String(row.updated_by),
    updatedByName: String(row.updated_by_name),
    updatedByColor: String(row.updated_by_color),
    updatedAt: Number(row.updated_at),
    title: String(row.title),
    coverUrl: galleryMediaUrl(String(row.item_id), "cover"),
    sourceUrl: galleryOutboundUrl(String(row.item_id)),
  }));
}

export async function upsertBoardItem(
  input: UpdateBoardItemInput,
): Promise<BoardMutation> {
  const now = Date.now();
  const rows = await sql`
    INSERT INTO board_items (
      board_id, item_id, lane, reason, position,
      updated_by, updated_by_name, updated_by_color, updated_at
    )
    VALUES (
      ${DEFAULT_BOARD_ID}, ${input.itemId}, ${input.lane}, ${input.reason},
      ${input.position}, ${input.updatedBy}, ${input.updatedByName},
      ${input.updatedByColor}, ${now}
    )
    ON CONFLICT (board_id, item_id) DO UPDATE SET
      lane = EXCLUDED.lane,
      reason = EXCLUDED.reason,
      position = EXCLUDED.position,
      updated_by = EXCLUDED.updated_by,
      updated_by_name = EXCLUDED.updated_by_name,
      updated_by_color = EXCLUDED.updated_by_color,
      updated_at = EXCLUDED.updated_at
    RETURNING *
  `;
  const row = rows[0];
  return {
    boardId: String(row.board_id),
    itemId: String(row.item_id),
    lane: toLane(row.lane),
    reason: String(row.reason || ""),
    position: Number(row.position),
    updatedBy: String(row.updated_by),
    updatedByName: String(row.updated_by_name),
    updatedByColor: String(row.updated_by_color),
    updatedAt: Number(row.updated_at),
  };
}
