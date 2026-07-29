import "server-only";

import { unstable_cache } from "next/cache";
import { sql } from "@/server/database/client";
import { galleryMediaUrl, galleryOutboundUrl } from "@/lib/media-routes";
import type { GalleryItem, GalleryPage } from "@/lib/types";

interface GalleryCursor {
  publishedAt: number;
  id: string;
}

const PUBLIC_ITEM_SLUG = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function encodeCursor(cursor: GalleryCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(value: string | null): GalleryCursor | null {
  if (!value) return null;
  try {
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<GalleryCursor>;
    if (
      typeof decoded.id !== "string" ||
      decoded.id.length === 0 ||
      typeof decoded.publishedAt !== "number" ||
      !Number.isFinite(decoded.publishedAt)
    ) {
      return null;
    }
    return { id: decoded.id, publishedAt: decoded.publishedAt };
  } catch {
    return null;
  }
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return (value as T) || fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function isVideoSource(value: string | null | undefined): boolean {
  return /\.(mp4|webm|mov|m4v)(?:$|[?#])/i.test(value || "");
}

function mapGalleryItem(row: Record<string, unknown>): GalleryItem {
  const id = String(row.id);
  const rawGallery = parseJson<GalleryItem["gallery"]>(row.gallery_json, []);
  const rawCoverUrl = String(row.cover_url || "");
  const rawCreatorAvatar = String(row.ca || "");
  const rawSourceUrl = String(row.source_url || "");

  return {
    id,
    slug: String(row.slug || ""),
    title: String(row.title || ""),
    description: String(row.description || ""),
    tagline: (row.tagline as string | null) ?? null,
    format: String(row.format || "tweet"),
    category_id: String(row.category_id || ""),
    category_name: String(row.catn || ""),
    category_slug: String(row.cats || ""),
    creator_id: String(row.creator_id || ""),
    creator_name: String(row.cn || ""),
    creator_handle: String(row.ch || ""),
    creator_avatar: rawCreatorAvatar ? galleryMediaUrl(id, "avatar") : "",
    source_url: rawSourceUrl ? galleryOutboundUrl(id) : "",
    source_type: String(row.source_type || ""),
    cover_url: rawCoverUrl
      ? galleryMediaUrl(id, "cover", isVideoSource(rawCoverUrl) ? "video" : undefined)
      : "",
    gallery: rawGallery.map((media, index) => ({
      ...media,
      url: galleryMediaUrl(
        id,
        index,
        media.mediaKind === "video" || isVideoSource(media.mediaUrl || media.url)
          ? "video"
          : undefined,
      ),
      mediaUrl: media.mediaUrl
        ? galleryMediaUrl(
            id,
            index,
            media.mediaKind === "video" || isVideoSource(media.mediaUrl)
              ? "video"
              : undefined,
          )
        : null,
    })),
    tags: parseJson(row.tags_json, []),
    stats: parseJson(row.stats_json, { views: 0, clicks: 0, copies: 0, outbounds: 0 }),
    rating: (row.rating as number | null) ?? null,
    tool: (row.tool as string | null) ?? null,
    github_url: (row.github_url as string | null) ?? null,
    github_stars: (row.github_stars as number | null) ?? null,
    pricing: (row.pricing as string | null) ?? null,
    published_at: Number(row.published_at || 0),
    created_at: Number(row.created_at || 0),
  };
}

export async function getGalleryPage({
  category = null,
  cursor = null,
  limit = 20,
}: {
  category?: string | null;
  cursor?: string | null;
  limit?: number;
} = {}): Promise<GalleryPage> {
  const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));
  const decodedCursor = decodeCursor(cursor);
  const where =
    category && decodedCursor
      ? sql`WHERE i.status = 'published' AND cat.slug = ${category} AND (i.published_at, i.id) < (${decodedCursor.publishedAt}, ${decodedCursor.id})`
      : category
        ? sql`WHERE i.status = 'published' AND cat.slug = ${category}`
        : decodedCursor
          ? sql`WHERE i.status = 'published' AND (i.published_at, i.id) < (${decodedCursor.publishedAt}, ${decodedCursor.id})`
          : sql`WHERE i.status = 'published'`;

  const rows = await sql`
    SELECT
      i.*,
      c.name AS cn,
      c.handle AS ch,
      c.avatar_url AS ca,
      cat.name AS catn,
      cat.slug AS cats
    FROM items i
    LEFT JOIN creators c ON i.creator_id = c.id
    LEFT JOIN gallery_categories cat ON i.category_id = cat.id
    ${where}
    ORDER BY i.published_at DESC, i.id DESC
    LIMIT ${safeLimit + 1}
  `;

  const hasMore = rows.length > safeLimit;
  const pageRows = rows.slice(0, safeLimit) as Record<string, unknown>[];
  const items = pageRows.map(mapGalleryItem);
  const lastRow = pageRows.at(-1);

  return {
    items,
    nextCursor:
      hasMore && lastRow
        ? encodeCursor({
            publishedAt: Number(lastRow.published_at),
            id: String(lastRow.id),
          })
        : null,
  };
}

const getCachedGalleryItem = unstable_cache(
  async (identifier: string): Promise<GalleryItem | null> => {
  const rows = await sql`
    SELECT
      i.*,
      c.name AS cn,
      c.handle AS ch,
      c.avatar_url AS ca,
      cat.name AS catn,
      cat.slug AS cats
    FROM items i
    LEFT JOIN creators c ON i.creator_id = c.id
    LEFT JOIN gallery_categories cat ON i.category_id = cat.id
    WHERE i.slug = ${identifier}
      AND i.status = 'published'
    LIMIT 1
  `;

  const row = rows[0] as Record<string, unknown> | undefined;
  return row ? mapGalleryItem(row) : null;
  },
  ["gallery-item"],
  { revalidate: 300 },
);

export async function getGalleryItem(identifier: string): Promise<GalleryItem | null> {
  if (!PUBLIC_ITEM_SLUG.test(identifier)) return null;
  return getCachedGalleryItem(identifier);
}

export type GalleryMediaTarget = {
  url: string;
  sourceUrl: string;
};

const getCachedMediaTarget = unstable_cache(
  async (itemId: string, asset: string): Promise<GalleryMediaTarget | null> => {
    const rows = await sql`
      SELECT i.cover_url, i.gallery_json, i.source_url, c.avatar_url AS creator_avatar
      FROM items i
      LEFT JOIN creators c ON i.creator_id = c.id
      WHERE i.id = ${itemId} AND i.status = 'published'
      LIMIT 1
    `;
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;

    const gallery = parseJson<GalleryItem["gallery"]>(row.gallery_json, []);
    const url = asset === "cover"
      ? String(row.cover_url || "")
      : asset === "avatar"
        ? String(row.creator_avatar || "")
        : /^\d+$/.test(asset)
          ? String(gallery[Number(asset)]?.mediaUrl || gallery[Number(asset)]?.url || "")
          : "";

    if (!url) return null;
    return { url, sourceUrl: String(row.source_url || "") };
  },
  ["gallery-media-target"],
  { revalidate: 300 },
);

export async function getGalleryMediaTarget(
  itemId: string,
  asset: string,
): Promise<GalleryMediaTarget | null> {
  return getCachedMediaTarget(itemId, asset);
}

const getCachedOutboundTarget = unstable_cache(
  async (itemId: string): Promise<string | null> => {
    const rows = await sql`
      SELECT source_url
      FROM items
      WHERE id = ${itemId} AND status = 'published'
      LIMIT 1
    `;
    const value = String((rows[0] as Record<string, unknown> | undefined)?.source_url || "");
    return value || null;
  },
  ["gallery-outbound-target"],
  { revalidate: 300 },
);

export async function getGalleryOutboundTarget(itemId: string): Promise<string | null> {
  return getCachedOutboundTarget(itemId);
}

export async function getPublishedItemSlugs(limit = 500): Promise<string[]> {
  const safeLimit = Math.min(2_000, Math.max(1, Math.floor(limit)));
  const rows = await sql`
    SELECT slug
    FROM items
    WHERE status = 'published' AND slug <> ''
    ORDER BY published_at DESC, id DESC
    LIMIT ${safeLimit}
  `;
  return rows
    .map(row => String(row.slug || ""))
    .filter(Boolean);
}
