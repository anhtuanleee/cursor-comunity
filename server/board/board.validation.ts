import type { BoardLane } from "@/lib/types";
import {
  asRecord,
  invalid,
  isHexColor,
  requiredString,
  valid,
  type ValidationResult,
} from "@/server/http/validation";
import { BOARD_LANES } from "./board.constants";

export interface UpdateBoardItemInput {
  itemId: string;
  lane: BoardLane;
  reason: string;
  position: number;
  updatedBy: string;
  updatedByName: string;
  updatedByColor: string;
}

export function parseBoardItemUpdate(
  value: unknown,
): ValidationResult<UpdateBoardItemInput> {
  const body = asRecord(value);
  if (!body) return invalid("Invalid request");

  const itemId = requiredString(body.itemId, 200);
  const updatedBy = requiredString(body.updatedBy, 200);
  const updatedByName = requiredString(body.updatedByName, 80);
  const lane =
    typeof body.lane === "string" &&
    BOARD_LANES.has(body.lane as BoardLane)
      ? (body.lane as BoardLane)
      : null;
  const position =
    typeof body.position === "number" &&
    Number.isSafeInteger(body.position) &&
    body.position >= 0
      ? body.position
      : 0;

  if (
    !itemId ||
    !updatedBy ||
    !updatedByName ||
    !lane ||
    !isHexColor(body.updatedByColor)
  ) {
    return invalid("Invalid shortlist item");
  }

  return valid({
    itemId,
    lane,
    reason:
      typeof body.reason === "string"
        ? body.reason.trim().slice(0, 280)
        : "",
    position,
    updatedBy,
    updatedByName,
    updatedByColor: body.updatedByColor,
  });
}
