import { CURATED_CREATIVE_SOURCES } from "./curated-sources";
import {
  classifyCreativeEntry,
  sourceCategoryFallback,
  type CreativeGalleryCategory,
} from "./classification";
import { ensureCreativeGalleryCategory } from "./category-repository";
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
  const persistedCategories = new Set<string>();
  const rejectedReasons = new Map<string, number>();
  const sourceResults: Array<{
    source: string;
    fetched: number;
    synced: number;
    rejected: number;
    status: "succeeded" | "not-modified" | "failed";
  }> = [];
  const countRejected = (reason: string) => {
    rejected++;
    rejectedReasons.set(reason, (rejectedReasons.get(reason) ?? 0) + 1);
  };
  const ensureCategory = async (category: CreativeGalleryCategory) => {
    if (!persistedCategories.has(category.id)) {
      await ensureCreativeGalleryCategory(sql, category);
      persistedCategories.add(category.id);
    }
    return category.id;
  };

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
          ${source.autoPublish ? "trusted-feed" : "automated-gate"},
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
          sourceResults.push({
            source: sourceName,
            fetched: 0,
            synced: 0,
            rejected: 0,
            status: "not-modified",
          });
          continue;
        }

        const entries = await enrichEntryImages(
          parseFeed(feed.body, source.url),
          source,
        );
        let importedCount = 0;
        let sourceRejected = 0;
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
          // Many quality RSS feeds omit individual bylines. Preserve the
          // publisher as the visible creator rather than reject valid work;
          // the raw item still records the original missing author field.
          const entryForModeration = {
            ...entry,
            author: entry.author ?? sourceName,
          };
          const moderation = moderateCreativeEntry(entryForModeration);
          await persistModerationDecision(sql, {
            sourceKey,
            externalId,
            ...moderation,
          });
          if (moderation.decision !== "approved") {
            await unpublishRejectedItem(sql, externalId);
            countRejected(moderation.reason);
            sourceRejected++;
            continue;
          }
          const author = entryForModeration.author?.trim();
          // Kept as a storage-boundary assertion even though the moderation
          // gate above has already validated the author.
          if (!author) {
            countRejected("missing-storage-author");
            sourceRejected++;
            continue;
          }
          // The gate has already verified it; this explicit narrowing keeps
          // the storage boundary non-nullable as well.
          const imageUrl = entry.imageUrl ?? entry.images?.[0]?.url ?? (
            entry.mediaKind === "video" || entry.mediaKind === "gif"
              ? entry.mediaUrl
              : null
          );
          if (!imageUrl) continue;
          const enriched = await enrichWithGemini(entryForModeration, source, env);
          const displayEntry = enriched
            ? { ...enriched, tags: enriched.tags }
            : { ...entryForModeration, description: "", tags: [] };
          const mediaTags = displayEntry.mediaKind === "image"
            ? []
            : [displayEntry.mediaKind, "motion"];
          const category = classifyCreativeEntry(
            {
              ...displayEntry,
              description: entryForModeration.description,
            },
            displayEntry.tags,
            sourceCategoryFallback(source),
          );
          await persistGalleryItem(sql, {
            externalId,
            categoryId: await ensureCategory(category),
            entry: { ...displayEntry, imageUrl, author },
            creatorId: `creative-creator-${payloadChecksum(`${sourceKey}:${author.toLowerCase()}`).slice(0, 24)}`,
            tags: sourceTags({
              ...source,
              tags: [...(source.tags ?? []), ...displayEntry.tags, ...mediaTags],
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
        sourceResults.push({
          source: sourceName,
          fetched: entries.length,
          synced: importedCount,
          rejected: sourceRejected,
          status: "succeeded",
        });
      } catch (error) {
        await markFailed(sql, runId, sourceKey, source.url, error);
        sourceResults.push({
          source: sourceName,
          fetched: 0,
          synced: 0,
          rejected: 0,
          status: "failed",
        });
      }
    }

    return {
      synced,
      rejected,
      rejectedReasons: Object.fromEntries(rejectedReasons),
      sourceResults,
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
