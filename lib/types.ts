// ========== Gallery Item (Flattened for Frontend) ==========

export interface GalleryItem {
  id: string;
  slug: string;
  title: string;
  description: string;
  tagline: string | null;
  format: string;
  category_id: string;
  category_name: string;
  category_slug: string;
  creator_id: string;
  creator_name: string;
  creator_handle: string;
  creator_avatar: string;
  source_url: string;
  source_type: string;
  cover_url: string;
  gallery: {
    url: string;
    width: number;
    height: number;
    mediaUrl?: string | null;
    mediaKind?: "image" | "video" | "gif" | "lottie";
  }[];
  tags: { id: string; context: string; slug: string; name: string }[];
  stats: { views: number; clicks: number; copies: number; outbounds: number };
  rating: number | null;
  tool: string | null;
  github_url: string | null;
  github_stars: number | null;
  pricing: string | null;
  published_at: number;
  created_at: number;
}

export interface GalleryPage {
  items: GalleryItem[];
  nextCursor: string | null;
}

// ========== WebSocket Messages ==========

export interface RemoteUser {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  lastSeen: number;
}

export interface Comment {
  id: string;
  item_id: string;
  user_id: string;
  user_name: string;
  user_color: string;
  text: string;
  parent_id: string | null;
  position_x: number | null;
  position_y: number | null;
  resolved: boolean;
  replies?: Comment[];
  created_at: number;
}

export interface CursorChat {
  user_id: string;
  user_name: string;
  user_color: string;
  text: string;
  sequence: number;
  updated_at: number;
}

export type ReactionKind = "love" | "useful" | "question";

export interface LiveReaction {
  id: string;
  itemId: string;
  kind: ReactionKind;
  userId: string;
  userName: string;
  userColor: string;
  delta: 1 | -1;
  createdAt: number;
}

export interface FocusState {
  itemId: string;
  presenterId: string;
  presenterName: string;
  presenterColor: string;
  version: number;
  updatedAt: number;
}

export type BoardLane = "keep" | "maybe" | "reject";

export interface BoardMutation {
  boardId: string;
  itemId: string;
  lane: BoardLane;
  reason: string;
  position: number;
  updatedBy: string;
  updatedByName: string;
  updatedByColor: string;
  updatedAt: number;
}

export interface BoardEntry extends BoardMutation {
  title: string;
  coverUrl: string;
  sourceUrl: string;
}

export type ReactionCounts = Record<ReactionKind, number>;

export type ClientMessage =
  | { type: "identify"; user: { id: string; name: string; color: string } }
  | { type: "cursor-move"; x: number; y: number }
  | { type: "cursor-chat-update"; text: string; sequence: number }
  | { type: "cursor-chat-clear"; sequence: number }
  | { type: "cursor-chat-exit"; sequence: number }
  | { type: "comment-publish"; comment: Comment }
  | { type: "reply-publish"; commentId: string; reply: Comment }
  | { type: "reaction-publish"; reaction: LiveReaction }
  | { type: "focus-set"; itemId: string }
  | { type: "focus-clear" }
  | { type: "board-item-publish"; mutation: BoardMutation };

export type ServerMessage =
  | {
      type: "room-state";
      users: RemoteUser[];
      chats: CursorChat[];
      focus: FocusState | null;
    }
  | { type: "user-joined"; user: RemoteUser }
  | { type: "user-left"; userId: string }
  | { type: "cursor-update"; userId: string; x: number; y: number }
  | { type: "cursor-chat-updated"; chat: CursorChat }
  | { type: "cursor-chat-cleared"; userId: string; sequence: number }
  | { type: "comment-added"; comment: Comment }
  | { type: "reply-added"; commentId: string; reply: Comment }
  | { type: "reaction-added"; reaction: LiveReaction }
  | { type: "focus-updated"; focus: FocusState }
  | { type: "focus-cleared"; version: number }
  | { type: "board-item-updated"; mutation: BoardMutation };
