export interface CreativeSource {
  url: string;
  name?: string;
  category?: string;
  tags?: string[];
  resolvePageImage?: boolean;
  /** Allow a curated directory feed to resolve its external article links. */
  allowExternalPreview?: boolean;
  /** Indicates a known source; every item still passes automated moderation. */
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
  /** RSS/Atom author; the source publisher is a transparent fallback. */
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
