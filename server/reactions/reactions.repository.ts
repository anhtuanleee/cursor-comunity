import { sql } from "@/server/database/client";
import type { ToggleReactionInput } from "./reactions.validation";

export interface ReactionCount {
  itemId: string;
  kind: string;
  count: number;
}

export interface UserReaction {
  itemId: string;
  kind: string;
}

export interface ToggleReactionResult {
  active: boolean;
  delta: 1 | -1;
  total: number;
}

export async function listReactionCounts(): Promise<ReactionCount[]> {
  const rows = await sql`
    SELECT item_id, kind, COUNT(*)::int AS count
    FROM reactions
    GROUP BY item_id, kind
  `;
  return rows.map(row => ({
    itemId: String(row.item_id),
    kind: String(row.kind),
    count: Number(row.count),
  }));
}

export async function listUserReactions(userId: string): Promise<UserReaction[]> {
  const rows = await sql`
    SELECT item_id, kind
    FROM reactions
    WHERE user_id = ${userId}
  `;
  return rows.map(row => ({
    itemId: String(row.item_id),
    kind: String(row.kind),
  }));
}

export async function toggleReaction(
  input: ToggleReactionInput,
): Promise<ToggleReactionResult> {
  return sql.begin(async transaction => {
    const removed = await transaction`
      DELETE FROM reactions
      WHERE item_id = ${input.itemId}
        AND user_id = ${input.userId}
        AND kind = ${input.kind}
      RETURNING item_id
    `;
    let delta: 1 | -1 = -1;

    if (removed.length === 0) {
      await transaction`
        INSERT INTO reactions (
          item_id, user_id, user_name, user_color, kind, created_at
        )
        VALUES (
          ${input.itemId}, ${input.userId}, ${input.userName},
          ${input.userColor}, ${input.kind}, ${Date.now()}
        )
        ON CONFLICT (item_id, user_id, kind) DO NOTHING
      `;
      delta = 1;
    }

    const countRows = await transaction`
      SELECT COUNT(*)::int AS count
      FROM reactions
      WHERE item_id = ${input.itemId} AND kind = ${input.kind}
    `;
    return {
      active: delta === 1,
      delta,
      total: Number(countRows[0]?.count || 0),
    };
  });
}
