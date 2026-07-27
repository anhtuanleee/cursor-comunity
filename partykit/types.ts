// ========== API Response Types (from recent.design) ==========

export interface MediaRendition {
  key: string;
  url: string;
  width: number;
  height: number;
}

export interface Media {
  url: string;
  mediaKey: string;
  role: string;
  mediaType: "image" | "video";
  mediaWidth: number;
  mediaHeight: number;
  posterKey?: string | null;
  posterUrl?: string | null;
  renditions: MediaRendition[];
}

export interface DesignItem {
  id: string;
  slug: string;
  title: string;
  format: string;
  category: {
    id: string;
    slug: string;
    name: string;
    scope: string;
    sortOrder: number;
  };
  source: {
    id: string;
    type: string;
    url: string;
    externalId: string;
    title: string;
    siteName: string | null;
    icon: string | null;
    createdAt: number;
    updatedAt: number;
  };
  creator: {
    id: string;
    name: string;
    handle: string;
    url: string;
    website: string | null;
    avatar: Media;
    createdAt: number;
    updatedAt: number;
  };
  capture: string;
  credit: {
    name: string;
    image: Media;
  };
  gallery: Media[];
  cover: Media;
  tagline: string | null;
  description: string;
  rating: number | null;
  ratingCount: number | null;
  pricing: string | null;
  pricingLabel: string | null;
  tool: string | null;
  installCommand: string | null;
  githubUrl: string | null;
  githubStars: number | null;
  githubStarsFetchedAt: number | null;
  tags: { id: string; context: string; slug: string; name: string; sortOrder: number }[];
  status: string;
  publishedAt: number;
  staffPickAt: number | null;
  createdAt: number;
  updatedAt: number;
  stats: {
    views: number;
    clicks: number;
    copies: number;
    outbounds: number;
  };
}

export interface RecentApiResponse {
  result: {
    data: {
      items: DesignItem[];
      nextCursor: string | null;
    };
  };
}

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

export type ClientMessage =
  | { type: "cursor-move"; x: number; y: number }
  | { type: "comment-add"; itemId: string; text: string; x?: number; y?: number }
  | { type: "comment-reply"; commentId: string; text: string }
  | { type: "comment-resolve"; commentId: string };

export type ServerMessage =
  | { type: "room-state"; users: RemoteUser[]; comments: Comment[] }
  | { type: "user-joined"; user: RemoteUser }
  | { type: "user-left"; userId: string }
  | { type: "cursor-update"; userId: string; x: number; y: number }
  | { type: "comment-added"; comment: Comment }
  | { type: "reply-added"; commentId: string; reply: Comment }
  | { type: "comment-resolved"; commentId: string }
  | { type: "items-updated"; count: number };

// ========== User & Comment ==========

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
