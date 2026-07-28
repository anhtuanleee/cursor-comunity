import type { BoardLane } from "@/lib/types";

export const DEFAULT_BOARD_ID = "community-shortlist";
export const BOARD_LANES = new Set<BoardLane>(["keep", "maybe", "reject"]);
