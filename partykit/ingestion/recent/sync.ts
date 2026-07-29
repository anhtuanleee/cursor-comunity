import type { RecentApiResponse } from "./api-types";
import { itemSlug } from "../creative-feed/identifiers";
import {
  finiteNumberOr,
  hasRequiredText,
  nullIfUndefined,
  requiredText,
} from "../shared/database-values";

const API_BASE = "https://api.recent.design/trpc/items.list";
const MAX_PAGES_PER_RUN = 1;
const PAGE_SIZE = 20;

function buildUrl(cursor: string | null): string {
  const input: Record<string, unknown> = {
    limit: PAGE_SIZE,
    feed: "x",
    format: "tweet",
    sort: "recent",
    direction: "forward",
  };
  if (cursor) input.cursor = cursor;
  return `${API_BASE}?batch=1&input=${encodeURIComponent(
    JSON.stringify({ 0: input }),
  )}`;
}

export async function syncRecentItems(
  env: Pick<Env, "DATABASE_URL">,
) {
  if (!env.DATABASE_URL) {
    return { synced: 0, error: "No DATABASE_URL" };
  }

  const { default: postgres } = await import("postgres");
  const sql = postgres(env.DATABASE_URL, { ssl: "require", max: 1 });
  let cursor: string | null = null;
  let total = 0;
  let pages = 0;
  let lockAcquired = false;

  try {
    const lock = await sql`
      SELECT pg_try_advisory_lock(
        hashtext('cursor-community-sync')
      ) AS acquired
    `;
    lockAcquired = Boolean(lock[0]?.acquired);
    if (!lockAcquired) {
      return { synced: 0, skipped: "Sync already running" };
    }

    const state = await sql`
      SELECT last_cursor
      FROM sync_state
      WHERE id = 1
    `;
    cursor = state[0]?.last_cursor
      ? String(state[0].last_cursor)
      : null;

    while (pages < MAX_PAGES_PER_RUN) {
      const response = await fetch(buildUrl(cursor));
      if (!response.ok) {
        throw new Error(`Recent API HTTP ${response.status}`);
      }

      const payload = (await response.json()) as RecentApiResponse;
      const page = payload[0]?.result?.data;
      if (!page?.items?.length) break;

      for (const item of page.items) {
        try {
          await upsertRecentItem(sql, item);
          total++;
        } catch (error) {
          console.error(
            JSON.stringify({
              event: "recent_item_upsert_failed",
              item: item.slug,
              error: error instanceof Error ? error.message : String(error),
            }),
          );
        }
      }

      pages++;
      cursor = nullIfUndefined(page.nextCursor);
      await sql`
        UPDATE sync_state
        SET last_cursor = ${cursor},
          last_sync = ${Date.now()},
          total_items = (SELECT COUNT(*) FROM items)
        WHERE id = 1
      `;
      if (!page.nextCursor) break;
    }

    return { synced: total, pages, cursor };
  } catch (error) {
    return {
      synced: total,
      pages,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (lockAcquired) {
      await sql`
        SELECT pg_advisory_unlock(hashtext('cursor-community-sync'))
      `;
    }
    await sql.end({ timeout: 5 });
  }
}

async function upsertRecentItem(
  sql: ReturnType<typeof import("postgres")>,
  item: NonNullable<
    RecentApiResponse[number]["result"]["data"]["items"]
  >[number],
) {
  const itemId = requiredText(item.id, "id");
  const title = requiredText(item.title, "title");
  const now = Date.now();
  const category = item.category;
  const categoryId = hasRequiredText(category?.id, category?.slug, category?.name)
    ? category.id
    : null;
  if (categoryId && category) {
    await sql`
      INSERT INTO gallery_categories(
        id, slug, name, scope, sort_order
      )
      VALUES(
        ${category.id}, ${category.slug}, ${category.name},
        ${nullIfUndefined(item.category.scope)}, ${nullIfUndefined(item.category.sortOrder)}
      )
      ON CONFLICT(id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        scope = EXCLUDED.scope,
        sort_order = EXCLUDED.sort_order
    `;
  }

  const creator = item.creator;
  const creatorId = hasRequiredText(creator?.id, creator?.name)
    ? creator.id
    : null;
  if (creatorId && creator) {
    const avatar =
      creator.avatar?.renditions?.find(r => r.width === 150)?.url ??
      creator.avatar?.url ??
      null;
    await sql`
      INSERT INTO creators(
        id, name, handle, url, website, avatar_url, created_at, updated_at
      )
      VALUES(
        ${creator.id}, ${creator.name}, ${nullIfUndefined(creator.handle)},
        ${nullIfUndefined(creator.url)}, ${nullIfUndefined(creator.website)}, ${avatar},
        ${nullIfUndefined(creator.createdAt)}, ${nullIfUndefined(creator.updatedAt)}
      )
      ON CONFLICT(id) DO UPDATE SET name = EXCLUDED.name
    `;
  }

  const media = Array.isArray(item.gallery)
    ? item.gallery
    : item.cover
      ? [item.cover]
      : [];
  const gallery = media.map(value => {
    const rendition =
      value.renditions?.find(r => r.width >= 720) ||
      value.renditions?.at(-1);
    return {
      url: rendition?.url || value.url,
      width: rendition?.width || value.mediaWidth,
      height: rendition?.height || value.mediaHeight,
    };
  });
  const cover =
    item.cover?.renditions?.find(r => r.width >= 720)?.url ??
    item.cover?.url ??
    gallery[0]?.url ??
    "";

  await sql`
    INSERT INTO items(
      id, slug, title, description, tagline, format, category_id,
      creator_id, source_url, source_type, cover_url, gallery_json,
      tags_json, stats_json, rating, rating_count, tool, github_url,
      github_stars, pricing, pricing_label, status, staff_pick_at,
      published_at, created_at, updated_at
    )
    VALUES(
      ${itemId}, ${itemSlug(item.source?.url || `recent:${itemId}`)}, ${title}, ${nullIfUndefined(item.description)},
      ${nullIfUndefined(item.tagline)}, ${nullIfUndefined(item.format) ?? "tweet"}, ${categoryId},
      ${creatorId}, ${nullIfUndefined(item.source?.url)},
      ${nullIfUndefined(item.source?.type)}, ${cover}, ${JSON.stringify(gallery)},
      ${JSON.stringify(
        (item.tags || []).map(tag => ({
          id: tag.id,
          context: tag.context,
          slug: tag.slug,
          name: tag.name,
        })),
      )},
      ${JSON.stringify(item.stats || {
        views: 0,
        clicks: 0,
        copies: 0,
        outbounds: 0,
      })},
      ${nullIfUndefined(item.rating)}, ${nullIfUndefined(item.ratingCount)}, ${nullIfUndefined(item.tool)}, ${nullIfUndefined(item.githubUrl)},
      ${nullIfUndefined(item.githubStars)}, ${nullIfUndefined(item.pricing)}, ${nullIfUndefined(item.pricingLabel)},
      ${nullIfUndefined(item.status) ?? "published"}, ${nullIfUndefined(item.staffPickAt)}, ${finiteNumberOr(item.publishedAt, now)},
      ${finiteNumberOr(item.createdAt, now)}, ${finiteNumberOr(item.updatedAt, now)}
    )
    ON CONFLICT(id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      slug = EXCLUDED.slug,
      cover_url = EXCLUDED.cover_url
  `;

  for (const tag of item.tags || []) {
    if (!hasRequiredText(tag.id, tag.slug, tag.name)) continue;
    await sql`
      INSERT INTO tags(id, context, slug, name, sort_order)
      VALUES(
        ${tag.id}, ${nullIfUndefined(tag.context)}, ${tag.slug}, ${tag.name}, ${nullIfUndefined(tag.sortOrder)}
      )
      ON CONFLICT(id) DO UPDATE SET name = EXCLUDED.name
    `;
    await sql`
      INSERT INTO item_tags(item_id, tag_id)
      VALUES(${itemId}, ${tag.id})
      ON CONFLICT DO NOTHING
    `;
  }
}
