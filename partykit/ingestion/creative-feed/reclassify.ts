import {
  classifyCreativeEntry,
  sourceCategoryFallback,
} from "./classification";
import { ensureCreativeGalleryCategories } from "./category-repository";
import type { CreativeEntry, CreativeSource } from "./types";

type StoredCreativeItem = {
  id: string;
  category_id: string | null;
  payload_json: unknown;
  config_json: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== "string") return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return asRecord(parsed);
  } catch {
    return null;
  }
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readEntry(value: unknown): Pick<CreativeEntry, "title" | "description" | "mediaKind"> | null {
  const entry = asRecord(value);
  const title = asText(entry?.title);
  if (!entry || !title) return null;
  const mediaKind = entry.mediaKind;
  return {
    title,
    description: asText(entry.description) ?? "",
    mediaKind: mediaKind === "video" || mediaKind === "gif" || mediaKind === "lottie"
      ? mediaKind
      : "image",
  };
}

function readSource(value: unknown): Pick<CreativeSource, "category" | "tags"> {
  const source = asRecord(value);
  return {
    category: asText(source?.category) ?? undefined,
    tags: Array.isArray(source?.tags)
      ? source.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
  };
}

export async function reclassifyCreativeGallery(
  env: Pick<Env, "DATABASE_URL">,
) {
  if (!env.DATABASE_URL) {
    return { scanned: 0, updated: 0, skipped: "No DATABASE_URL configured" };
  }

  const { default: postgresClient } = await import("postgres");
  const sql = postgresClient(env.DATABASE_URL, {
    ssl: "require",
    max: 1,
    prepare: false,
  });

  try {
    await ensureCreativeGalleryCategories(sql);
    const rows = await sql<StoredCreativeItem[]>`
      SELECT DISTINCT ON (items.id)
        items.id,
        items.category_id,
        raw_items.payload_json,
        content_sources.config_json
      FROM items
      INNER JOIN raw_items ON raw_items.external_id = items.id
      INNER JOIN content_sources ON content_sources.id = raw_items.source_id
      WHERE items.source_type = 'creative-feed'
      ORDER BY items.id, raw_items.fetched_at DESC
    `;

    let updated = 0;
    let skipped = 0;
    for (const row of rows) {
      const entry = readEntry(row.payload_json);
      if (!entry) {
        skipped++;
        continue;
      }
      const category = classifyCreativeEntry(
        entry,
        [],
        sourceCategoryFallback(readSource(row.config_json)),
      );
      if (row.category_id === category.id) continue;
      await sql`
        UPDATE items
        SET category_id = ${category.id}, updated_at = ${Date.now()}
        WHERE id = ${row.id} AND source_type = 'creative-feed'
      `;
      updated++;
    }

    return { scanned: rows.length, updated, skipped };
  } finally {
    await sql.end({ timeout: 5 });
  }
}
