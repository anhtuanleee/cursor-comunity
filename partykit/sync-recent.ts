import type { RecentApiResponse } from "./types";

const API_BASE = "https://api.recent.design/trpc/items.list";
function buildUrl(c: string|null): string {
  const inp: Record<string,unknown> = {limit:50,feed:"x",format:"tweet",sort:"recent",direction:"forward"};
  if (c) inp.cursor = c;
  return `${API_BASE}?batch=1&input=${encodeURIComponent(JSON.stringify({0:inp}))}`;
}


export async function syncRecentItems(env: { DATABASE_URL?: string }) {
  if (!env.DATABASE_URL) return { synced:0, error:"No DATABASE_URL" };
  const { default: postgres } = await import("postgres");
  const sql = postgres(env.DATABASE_URL, { ssl: "require", max: 1 });

  let cursor: string|null = null;
  let total = 0, pages = 0;
  let lockAcquired = false;

  try {
    const lock = await sql`SELECT pg_try_advisory_lock(hashtext('cursor-community-sync')) AS acquired`;
    lockAcquired = Boolean(lock[0]?.acquired);
    if (!lockAcquired) return { synced: 0, skipped: "Sync already running" };

    const state = await sql`SELECT last_cursor FROM sync_state WHERE id=1`;
    cursor = state[0]?.last_cursor ?? null;
    while (pages < 4) {
      const url = buildUrl(cursor);
      console.log(`[sync] Fetching page ${pages+1}`);
      const res = await fetch(url);
      if (!res.ok) { console.error(`[sync] API error: ${res.status}`); break; }
      const data = await res.json() as RecentApiResponse[];
      const { items=[], nextCursor=null } = data[0]?.result?.data ?? {};
      if (!items.length) break;

      for (const item of items) {
        try {
          if (item.category) await sql`INSERT INTO gallery_categories(id,slug,name,scope,sort_order) VALUES(${item.category.id},${item.category.slug},${item.category.name},${item.category.scope},${item.category.sortOrder}) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name,slug=EXCLUDED.slug,scope=EXCLUDED.scope,sort_order=EXCLUDED.sort_order`;

          if (item.creator) {
            const av = item.creator.avatar?.renditions?.find(r=>r.width===150)?.url ?? item.creator.avatar?.url ?? null;
            await sql`INSERT INTO creators(id,name,handle,url,website,avatar_url,created_at,updated_at) VALUES(${item.creator.id},${item.creator.name},${item.creator.handle},${item.creator.url},${item.creator.website},${av},${item.creator.createdAt},${item.creator.updatedAt}) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name`;
          }

          const cover = item.cover?.renditions?.find(r=>r.width>=720)?.url ?? item.cover?.url ?? (item.gallery?.[0]?.renditions?.find(r=>r.width>=720)?.url ?? "");
          const gal = (item.gallery||(item.cover?[item.cover]:[])).map(m=>{const b=m.renditions?.find(r=>r.width>=720)||m.renditions?.[m.renditions.length-1];return{url:b?.url||m.url,width:b?.width||m.mediaWidth,height:b?.height||m.mediaHeight}});

          await sql`INSERT INTO items(id,slug,title,description,tagline,format,category_id,creator_id,source_url,source_type,cover_url,gallery_json,tags_json,stats_json,rating,rating_count,tool,github_url,github_stars,pricing,pricing_label,status,staff_pick_at,published_at,created_at,updated_at) VALUES(${item.id},${item.slug},${item.title},${item.description},${item.tagline},${item.format},${item.category?.id||null},${item.creator?.id||null},${item.source?.url||null},${item.source?.type||null},${cover},${JSON.stringify(gal)},${JSON.stringify((item.tags||[]).map(t=>({id:t.id,context:t.context,slug:t.slug,name:t.name})))},${JSON.stringify(item.stats||{views:0,clicks:0,copies:0,outbounds:0})},${item.rating},${item.ratingCount},${item.tool},${item.githubUrl},${item.githubStars},${item.pricing},${item.pricingLabel},${item.status},${item.staffPickAt},${item.publishedAt},${item.createdAt},${item.updatedAt}) ON CONFLICT(id) DO UPDATE SET title=EXCLUDED.title,description=EXCLUDED.description,cover_url=EXCLUDED.cover_url`;

          for (const tag of (item.tags||[])) {
            await sql`INSERT INTO tags(id,context,slug,name,sort_order) VALUES(${tag.id},${tag.context},${tag.slug},${tag.name},${tag.sortOrder}) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name`;
            await sql`INSERT INTO item_tags(item_id,tag_id) VALUES(${item.id},${tag.id}) ON CONFLICT DO NOTHING`;
          }
        } catch(err) { console.error(`[sync] Error upserting ${item.slug}:`,err); }
      }

      total += items.length;
      pages++;
      cursor = nextCursor;
      await sql`
        UPDATE sync_state
        SET last_cursor=${cursor},last_sync=${Date.now()},total_items=(SELECT COUNT(*) FROM items)
        WHERE id=1
      `;
      if (!nextCursor) break;
    }

    console.log(`[sync] Done: ${total} items in ${pages} pages`);
    return { synced:total, cursor };
  } catch(err) {
    console.error(`[sync] Error:`,err);
    return { synced:total, error:String(err) };
  } finally {
    if (lockAcquired) {
      await sql`SELECT pg_advisory_unlock(hashtext('cursor-community-sync'))`;
    }
    await sql.end({ timeout: 5 });
  }
}
