import {
  asRecord,
  invalid,
  isHexColor,
  optionalFiniteNumber,
  optionalString,
  requiredString,
  valid,
  type ValidationResult,
} from "@/server/http/validation";

const MAX_COMMENT_LENGTH = 2_000;

export interface CreateCommentInput {
  itemId: string;
  userId: string;
  userName: string;
  userColor: string;
  text: string;
  parentId: string | null;
  x: number | null;
  y: number | null;
}

export function parseCreateComment(
  value: unknown,
): ValidationResult<CreateCommentInput> {
  const body = asRecord(value);
  if (!body) return invalid("Invalid request");

  const itemId = requiredString(body.itemId, 200);
  const userId = requiredString(body.userId, 200);
  const userName = requiredString(body.userName, 80);
  const text = requiredString(body.text, MAX_COMMENT_LENGTH);
  const parentId = optionalString(body.parentId, 200);

  if (!itemId) return invalid("Invalid itemId");
  if (!userId) return invalid("Invalid userId");
  if (!userName) return invalid("Invalid userName");
  if (!isHexColor(body.userColor)) return invalid("Invalid userColor");
  if (!text) {
    return invalid("Comment must be between 1 and 2000 characters");
  }
  if (parentId === undefined) return invalid("Invalid parentId");

  return valid({
    itemId,
    userId,
    userName,
    userColor: body.userColor,
    text,
    parentId,
    x: optionalFiniteNumber(body.x),
    y: optionalFiniteNumber(body.y),
  });
}
