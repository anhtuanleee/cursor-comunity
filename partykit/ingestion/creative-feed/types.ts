export interface CreativeSource {
  url: string;
  name?: string;
  category?: string;
  tags?: string[];
  resolvePageImage?: boolean;
  /** Only sources maintained in curated-sources.ts may publish automatically. */
  autoPublish?: boolean;
}

export interface CreativeEntry {
  title: string;
  link: string;
  description: string;
  imageUrl: string | null;
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
