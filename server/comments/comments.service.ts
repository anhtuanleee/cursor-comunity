import type { Comment } from "@/lib/types";
import { HttpError } from "@/server/http/http-error";
import {
  countRecentComments,
  findCommentsByItem,
  insertComment,
  parentCommentExists,
} from "./comments.repository";
import type { CreateCommentInput } from "./comments.validation";

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_COUNT = 10;

export async function getCommentTree(itemId: string): Promise<Comment[]> {
  const comments = await findCommentsByItem(itemId);
  const topLevel: Comment[] = [];
  const byId = new Map<string, Comment>();

  for (const comment of comments) {
    byId.set(comment.id, comment);
    if (!comment.parent_id) topLevel.push(comment);
  }

  for (const comment of comments) {
    if (!comment.parent_id) continue;
    byId.get(comment.parent_id)?.replies?.push(comment);
  }

  return topLevel.sort((a, b) => b.created_at - a.created_at);
}

export async function createComment(
  input: CreateCommentInput,
): Promise<Comment> {
  const recentCount = await countRecentComments(
    input.userId,
    Date.now() - RATE_LIMIT_WINDOW,
  );
  if (recentCount >= RATE_LIMIT_COUNT) {
    throw new HttpError("Too many comments. Please wait a minute.", 429);
  }

  if (
    input.parentId &&
    !(await parentCommentExists(input.parentId, input.itemId))
  ) {
    throw new HttpError("Parent comment not found", 404);
  }

  return insertComment(input);
}
