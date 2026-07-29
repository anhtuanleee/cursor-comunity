import { CURATED_CREATIVE_SOURCES } from "./curated-sources";
import { enrichWithGemini } from "./gemini-enrichment";
import { fetchFeed } from "./feed-client";
import { parseFeed } from "./feed-parser";
import {
  itemId,
  itemSlug,
  payloadChecksum,
  slugify,
  sourceId,
} from "./identifiers";
import {
  isHttpUrl,
  mergeSources,
  parseSources,
} from "./source-config";
import {
  markFailed,
  markNotModified,
  markSucceeded,
  persistGalleryItem,
  persistModerationDecision,
  persistRawItem,
  unpublishRejectedItem,
} from "./repository";
import { enrichEntryImages } from "./page-preview";
import { moderateCreativeEntry } from "./moderation";
import type { CreativeSource } from "./types";

const DEFAULT_CATEGORY = {
  id: "creative-content",
  name: "Creative Content",
};
const SOURCES_PER_RUN = 4;

function sourceBatch(sources: CreativeSource[]): CreativeSource[] {
  if (sources.length <= SOURCES_PER_RUN) return sources;
  const batches = Math.ceil(sources.length / SOURCES_PER_RUN);
  const interval = 30 * 60 * 1_000;
  const batchIndex = Math.floor(Date.now() / interval) % batches;
  const start = batchIndex * SOURCES_PER_RUN;
  return sources.slice(start, start + SOURCES_PER_RUN);
}

function sourceTags(source: CreativeSource) {
  const hostname = new URL(source.url).hostname;
  return [
    {
      id: `source-${slugify(hostname)}`,
      context: "source",
      slug: slugify(hostname),
      name: hostname,
    },
    ...(source.tags ?? []).map(tag => ({
      id: `creative-${slugify(tag)}`,
      context: "creative",
      slug: slugify(tag),
      name: tag,
    })),
  ];
}

export async function syncCreativeSources(
  env: Pick<Env, "DATABASE_URL" | "CREATIVE_FEEDS" | "GEMINI_API_KEY" | "GEMINI_MODEL">,
) {
  const sources = mergeSources(
    CURATED_CREATIVE_SOURCES,
    parseSources(env.CREATIVE_FEEDS),
  );
  if (!env.DATABASE_URL) {
    return {
      synced: 0,
      skipped: "No DATABASE_URL configured",
    };
  }

  const { default: postgres } = await import("postgres");
  const sql = postgres(env.DATABASE_URL, {
    ssl: "require",
    max: 1,
    prepare: false,
  });
  let lockAcquired = false;
  let synced = 0;
  let rejected = 0;

  try {
    const lock = await sql`
      SELECT pg_try_advisory_lock(
        hashtext('cursor-community-creative-sync')
      ) AS acquired
    `;
    lockAcquired = Boolean(lock[0]?.acquired);
    if (!lockAcquired) {
      return { synced: 0, skipped: "Creative sync already running" };
    }

    const scheduledSources = sourceBatch(sources);
    for (const source of scheduledSources) {
      if (!isHttpUrl(source.url)) continue;
      const sourceKey = sourceId(source.url);
      const runId = crypto.randomUUID();
      const startedAt = Date.now();
      const hostname = new URL(source.url).hostname;
      const sourceName = source.name?.trim() || hostname;

      const sourceRows = await sql`
        INSERT INTO content_sources(
          id, kind, url, name, enabled, rights_mode, trust_level,
          config_json, created_at, updated_at
        )
        VALUES(
          ${sourceKey}, 'rss', ${source.url}, ${sourceName}, TRUE, 'link-only',
          ${source.autoPublish ? "trusted-feed" : "review-required"},
          ${JSON.stringify(source)}, ${startedAt}, ${startedAt}
        )
        ON CONFLICT(url) DO UPDATE SET
          config_json = EXCLUDED.config_json,
          trust_level = EXCLUDED.trust_level,
          updated_at = EXCLUDED.updated_at
        RETURNING enabled
      `;
      // A source can be disabled in the database without redeploying. Keep
      // that editorial safety switch authoritative over configuration.
      if (!sourceRows[0]?.enabled) continue;
      await sql`
        INSERT INTO crawl_runs(id, source_id, status, started_at)
        VALUES(${runId}, ${sourceKey}, 'running', ${startedAt})
      `;

      try {
        const checkpointRows = await sql`
          SELECT etag, last_modified
          FROM crawl_checkpoints
          WHERE source_id = ${sourceKey}
        `;
        const feed = await fetchFeed(source.url, {
          etag: checkpointRows[0]?.etag
            ? String(checkpointRows[0].etag)
            : null,
          lastModified: checkpointRows[0]?.last_modified
            ? String(checkpointRows[0].last_modified)
            : null,
        });
        if (feed.notModified) {
          await markNotModified(sql, runId, sourceKey, feed);
          continue;
        }

        const entries = await enrichEntryImages(
          parseFeed(feed.body, source.url),
          source,
        );
        const category = source.category?.trim() || DEFAULT_CATEGORY.name;
        const categorySlug = slugify(category);
        const categoryId = source.category
          ? `creative-${categorySlug}`
          : DEFAULT_CATEGORY.id;
        const categoryRows = await sql`
          INSERT INTO gallery_categories(
            id, slug, name, scope, sort_order
          )
          VALUES(
            ${categoryId}, ${categorySlug}, ${category},
            'creative', 100
          )
          ON CONFLICT(slug) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `;
        const resolvedCategoryId = String(
          categoryRows[0]?.id ?? categoryId,
        );

        let importedCount = 0;
        for (const entry of entries) {
          const externalId = itemId(entry.link);
          const payload = JSON.stringify(entry);
          await persistRawItem(sql, {
            sourceKey,
            externalId,
            entry,
            payload,
            checksum: payloadChecksum(payload),
          });
          const moderation = moderateCreativeEntry(entry, source);
          await persistModerationDecision(sql, {
            sourceKey,
            externalId,
            ...moderation,
          });
          if (moderation.decision !== "approved") {
            await unpublishRejectedItem(sql, externalId);
            rejected++;
            continue;
          }
          // The gate has already verified it; this explicit narrowing keeps
          // the storage boundary non-nullable as well.
          const imageUrl = entry.imageUrl ?? (
            entry.mediaKind === "video" || entry.mediaKind === "gif"
              ? entry.mediaUrl
              : null
          );
          if (!imageUrl) continue;
          const enriched = await enrichWithGemini(entry, source, env);
          const displayEntry = enriched
            ? {
                ...enriched,
                tags: [...(source.tags ?? []), ...enriched.tags],
              }
            : { ...entry, description: "", tags: source.tags ?? [] };
          const mediaTags = displayEntry.mediaKind === "image"
            ? []
            : [displayEntry.mediaKind, "motion"];
          await persistGalleryItem(sql, {
            externalId,
            categoryId: resolvedCategoryId,
            entry: { ...displayEntry, imageUrl },
            tags: sourceTags({
              ...source,
              tags: [...displayEntry.tags, ...mediaTags],
            }),
            itemSlug,
          });
          synced++;
          importedCount++;
        }

        await markSucceeded(
          sql,
          runId,
          sourceKey,
          feed,
          entries.length,
          importedCount,
        );
      } catch (error) {
        await markFailed(sql, runId, sourceKey, source.url, error);
      }
    }

    return {
      synced,
      rejected,
      sources: scheduledSources.length,
      totalSources: sources.length,
    };
  } finally {
    if (lockAcquired) {
      await sql`
        SELECT pg_advisory_unlock(
          hashtext('cursor-community-creative-sync')
        )
      `;
    }
    await sql.end({ timeout: 5 });
  }
}
