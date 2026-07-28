import type { RecentApiResponse } from "./api-types";

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
      cursor = page.nextCursor;
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
  if (item.category) {
    await sql`
      INSERT INTO gallery_categories(
        id, slug, name, scope, sort_order
      )
      VALUES(
        ${item.category.id}, ${item.category.slug}, ${item.category.name},
        ${item.category.scope}, ${item.category.sortOrder}
      )
      ON CONFLICT(id) DO UPDATE SET
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        scope = EXCLUDED.scope,
        sort_order = EXCLUDED.sort_order
    `;
  }

  if (item.creator) {
    const avatar =
      item.creator.avatar?.renditions?.find(r => r.width === 150)?.url ??
      item.creator.avatar?.url ??
      null;
    await sql`
      INSERT INTO creators(
        id, name, handle, url, website, avatar_url, created_at, updated_at
      )
      VALUES(
        ${item.creator.id}, ${item.creator.name}, ${item.creator.handle},
        ${item.creator.url}, ${item.creator.website}, ${avatar},
        ${item.creator.createdAt}, ${item.creator.updatedAt}
      )
      ON CONFLICT(id) DO UPDATE SET name = EXCLUDED.name
    `;
  }

  const media = item.gallery || (item.cover ? [item.cover] : []);
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
      ${item.id}, ${item.slug}, ${item.title}, ${item.description},
      ${item.tagline}, ${item.format}, ${item.category?.id || null},
      ${item.creator?.id || null}, ${item.source?.url || null},
      ${item.source?.type || null}, ${cover}, ${JSON.stringify(gallery)},
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
      ${item.rating}, ${item.ratingCount}, ${item.tool}, ${item.githubUrl},
      ${item.githubStars}, ${item.pricing}, ${item.pricingLabel},
      ${item.status}, ${item.staffPickAt}, ${item.publishedAt},
      ${item.createdAt}, ${item.updatedAt}
    )
    ON CONFLICT(id) DO UPDATE SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      cover_url = EXCLUDED.cover_url
  `;

  for (const tag of item.tags || []) {
    await sql`
      INSERT INTO tags(id, context, slug, name, sort_order)
      VALUES(
        ${tag.id}, ${tag.context}, ${tag.slug}, ${tag.name}, ${tag.sortOrder}
      )
      ON CONFLICT(id) DO UPDATE SET name = EXCLUDED.name
    `;
    await sql`
      INSERT INTO item_tags(item_id, tag_id)
      VALUES(${item.id}, ${tag.id})
      ON CONFLICT DO NOTHING
    `;
  }
}
