import type postgres from "postgres";
import type { CreativeEntry, FeedResponse } from "./types";

type Database = postgres.Sql;

export async function markNotModified(
  sql: Database,
  runId: string,
  sourceKey: string,
  feed: Pick<FeedResponse, "etag" | "lastModified">,
) {
  const finishedAt = Date.now();
  await sql`
    INSERT INTO crawl_checkpoints(
      source_id, etag, last_modified, last_success_at, last_error, updated_at
    )
    VALUES(
      ${sourceKey}, ${feed.etag}, ${feed.lastModified}, ${finishedAt},
      NULL, ${finishedAt}
    )
    ON CONFLICT(source_id) DO UPDATE SET
      last_success_at = EXCLUDED.last_success_at,
      last_error = NULL,
      updated_at = EXCLUDED.updated_at
  `;
  await sql`
    UPDATE crawl_runs
    SET status = 'not-modified', finished_at = ${finishedAt}
    WHERE id = ${runId}
  `;
}

export async function persistRawItem(
  sql: Database,
  input: {
    sourceKey: string;
    externalId: string;
    entry: Pick<CreativeEntry, "link" | "publishedAt">;
    payload: string;
    checksum: string;
  },
) {
  await sql`
    INSERT INTO raw_items(
      source_id, external_id, canonical_url, payload_json,
      payload_checksum, source_published_at, fetched_at
    )
    VALUES(
      ${input.sourceKey}, ${input.externalId}, ${input.entry.link},
      ${input.payload}, ${input.checksum}, ${input.entry.publishedAt},
      ${Date.now()}
    )
    ON CONFLICT(source_id, external_id) DO UPDATE SET
      canonical_url = EXCLUDED.canonical_url,
      payload_json = EXCLUDED.payload_json,
      payload_checksum = EXCLUDED.payload_checksum,
      source_published_at = EXCLUDED.source_published_at,
      fetched_at = EXCLUDED.fetched_at
  `;
}

export async function persistModerationDecision(
  sql: Database,
  input: {
    sourceKey: string;
    externalId: string;
    decision: "approved" | "rejected";
    reason: string;
  },
) {
  const previous = await sql`
    SELECT decision, reason
    FROM moderation_decisions
    WHERE source_id = ${input.sourceKey} AND external_id = ${input.externalId}
    ORDER BY decided_at DESC
    LIMIT 1
  `;
  if (
    previous[0]?.decision === input.decision &&
    previous[0]?.reason === input.reason
  ) return;

  await sql`
    INSERT INTO moderation_decisions(
      id, source_id, external_id, decision, reason, decided_by, decided_at
    )
    VALUES(
      ${crypto.randomUUID()}, ${input.sourceKey}, ${input.externalId},
      ${input.decision}, ${input.reason}, 'automated-quality-gate-v1', ${Date.now()}
    )
  `;
}

export async function persistGalleryItem(
  sql: Database,
  input: {
    externalId: string;
    categoryId: string;
    entry: CreativeEntry & { imageUrl: string };
    tags: Array<{
      id: string;
      context: string;
      slug: string;
      name: string;
    }>;
    itemSlug: (link: string) => string;
  },
) {
  const image = {
    url: input.entry.imageUrl,
    width: 0,
    height: 0,
    mediaUrl: input.entry.mediaUrl,
    mediaKind: input.entry.mediaKind,
  };
  await sql`
    INSERT INTO items(
      id, slug, title, description, tagline, format, category_id,
      creator_id, source_url, source_type, cover_url, gallery_json,
      tags_json, stats_json, status, published_at, created_at, updated_at
    )
    VALUES(
      ${input.externalId},
      ${input.itemSlug(input.entry.link)},
      ${input.entry.title}, ${input.entry.description}, NULL, 'creative',
      ${input.categoryId}, NULL, ${input.entry.link}, 'creative-feed',
      ${input.entry.imageUrl}, ${JSON.stringify([image])},
      ${JSON.stringify(input.tags)},
      ${JSON.stringify({ views: 0, clicks: 0, copies: 0, outbounds: 0 })},
      'published', ${input.entry.publishedAt}, ${input.entry.publishedAt},
      ${Date.now()}
    )
    ON CONFLICT(id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      slug = EXCLUDED.slug,
      cover_url = EXCLUDED.cover_url,
      gallery_json = EXCLUDED.gallery_json,
      tags_json = EXCLUDED.tags_json,
      published_at = EXCLUDED.published_at,
      updated_at = EXCLUDED.updated_at
  `;
}

export async function markSucceeded(
  sql: Database,
  runId: string,
  sourceKey: string,
  feed: Pick<FeedResponse, "etag" | "lastModified">,
  fetchedCount: number,
  importedCount: number,
) {
  const finishedAt = Date.now();
  await sql`
    INSERT INTO crawl_checkpoints(
      source_id, etag, last_modified, last_success_at, last_error, updated_at
    )
    VALUES(
      ${sourceKey}, ${feed.etag}, ${feed.lastModified}, ${finishedAt},
      NULL, ${finishedAt}
    )
    ON CONFLICT(source_id) DO UPDATE SET
      etag = EXCLUDED.etag,
      last_modified = EXCLUDED.last_modified,
      last_success_at = EXCLUDED.last_success_at,
      last_error = NULL,
      updated_at = EXCLUDED.updated_at
  `;
  await sql`
    UPDATE crawl_runs
    SET status = 'succeeded',
      fetched_count = ${fetchedCount},
      imported_count = ${importedCount},
      finished_at = ${finishedAt}
    WHERE id = ${runId}
  `;
}

export async function markFailed(
  sql: Database,
  runId: string,
  sourceKey: string,
  sourceUrl: string,
  error: unknown,
) {
  const message = error instanceof Error ? error.message : String(error);
  const finishedAt = Date.now();
  console.error(
    JSON.stringify({
      event: "creative_sync_failed",
      source: sourceUrl,
      error: message,
    }),
  );
  await sql`
    INSERT INTO crawl_checkpoints(source_id, last_error, updated_at)
    VALUES(${sourceKey}, ${message.slice(0, 1_000)}, ${finishedAt})
    ON CONFLICT(source_id) DO UPDATE SET
      last_error = EXCLUDED.last_error,
      updated_at = EXCLUDED.updated_at
  `;
  await sql`
    UPDATE crawl_runs
    SET status = 'failed',
      error = ${message.slice(0, 1_000)},
      finished_at = ${finishedAt}
    WHERE id = ${runId}
  `;
}
