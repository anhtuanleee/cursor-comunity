import type { ReactionKind } from "@/lib/types";
import {
  asRecord,
  invalid,
  isHexColor,
  requiredString,
  valid,
  type ValidationResult,
} from "@/server/http/validation";

const REACTION_KINDS = new Set<ReactionKind>([
  "love",
  "useful",
  "question",
]);

export interface ToggleReactionInput {
  itemId: string;
  userId: string;
  userName: string;
  userColor: string;
  kind: ReactionKind;
}

export function parseReactionToggle(
  value: unknown,
): ValidationResult<ToggleReactionInput> {
  const body = asRecord(value);
  if (!body) return invalid("Invalid request");

  const itemId = requiredString(body.itemId, 200);
  const userId = requiredString(body.userId, 200);
  const userName = requiredString(body.userName, 80);
  const kind =
    typeof body.kind === "string" &&
    REACTION_KINDS.has(body.kind as ReactionKind)
      ? (body.kind as ReactionKind)
      : null;

  if (!itemId || !userId || !userName || !kind || !isHexColor(body.userColor)) {
    return invalid("Invalid reaction");
  }

  return valid({
    itemId,
    userId,
    userName,
    userColor: body.userColor,
    kind,
  });
}
