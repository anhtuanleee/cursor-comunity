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
  gallery: { url: string; width: number; height: number }[];
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

export interface ChatMessage {
  id: string;
  user_id: string;
  user_name: string;
  user_color: string;
  text: string;
  created_at: number;
}

export type ClientMessage =
  | { type: "identify"; user: { id: string; name: string; color: string } }
  | { type: "cursor-move"; x: number; y: number }
  | { type: "comment-publish"; comment: Comment }
  | { type: "reply-publish"; commentId: string; reply: Comment }
  | { type: "chat-send"; message: ChatMessage };

export type ServerMessage =
  | { type: "room-state"; users: RemoteUser[] }
  | { type: "user-joined"; user: RemoteUser }
  | { type: "user-left"; userId: string }
  | { type: "cursor-update"; userId: string; x: number; y: number }
  | { type: "comment-added"; comment: Comment }
  | { type: "reply-added"; commentId: string; reply: Comment }
  | { type: "chat-message"; message: ChatMessage };
