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

export interface RecentApiEnvelope {
  result: {
    data: {
      items: DesignItem[];
      nextCursor: string | null;
    };
  };
}

export type RecentApiResponse = RecentApiEnvelope[];
