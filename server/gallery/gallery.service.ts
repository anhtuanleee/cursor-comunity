import "server-only";

import { sql } from "@/server/database/client";
import type { GalleryItem, GalleryPage } from "@/lib/types";

interface GalleryCursor {
  publishedAt: number;
  id: string;
}

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

function mapGalleryItem(row: Record<string, unknown>): GalleryItem {
  return {
    id: String(row.id),
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
    creator_avatar: String(row.ca || ""),
    source_url: String(row.source_url || ""),
    source_type: String(row.source_type || ""),
    cover_url: String(row.cover_url || ""),
    gallery: parseJson(row.gallery_json, []),
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

export async function getGalleryItem(identifier: string): Promise<GalleryItem | null> {
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
    WHERE (i.slug = ${identifier} OR i.id = ${identifier})
      AND i.status = 'published'
    LIMIT 1
  `;

  const row = rows[0] as Record<string, unknown> | undefined;
  return row ? mapGalleryItem(row) : null;
}
