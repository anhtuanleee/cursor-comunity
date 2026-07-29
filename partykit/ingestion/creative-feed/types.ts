export interface CreativeSource {
  url: string;
  name?: string;
  category?: string;
  tags?: string[];
  resolvePageImage?: boolean;
  /** Only sources maintained in curated-sources.ts may publish automatically. */
  autoPublish?: boolean;
}

export interface CreativeImage {
  url: string;
  width: number;
  height: number;
  role: "hero" | "gallery" | "social" | "video-poster";
  source: "feed" | "og:image" | "twitter:image" | "picture" | "img" | "json-ld" | "video";
  alt?: string;
}

export interface CreativeEntry {
  title: string;
  /** RSS/Atom article author. A publisher fallback is deliberately not used. */
  author: string | null;
  link: string;
  description: string;
  imageUrl: string | null;
  images?: CreativeImage[];
  mediaUrl: string | null;
  mediaKind: "image" | "video" | "gif" | "lottie";
  publishedAt: number;
}

export interface FeedCheckpoint {
  etag: string | null;
  lastModified: string | null;
}

export interface FeedResponse extends FeedCheckpoint {
  body: string;
  notModified: boolean;
}
