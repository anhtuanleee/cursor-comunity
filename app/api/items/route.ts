import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

function integerParam(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export async function GET(req: NextRequest) {
  const cat = req.nextUrl.searchParams.get("category");
  const lim = integerParam(req.nextUrl.searchParams.get("limit"), 20, 1, 50);
  const off = integerParam(req.nextUrl.searchParams.get("offset"), 0, 0, 100_000);

  try {
    const rows = cat
      ? await sql`SELECT i.*,c.name as cn,c.handle as ch,c.avatar_url as ca,cat.name as catn,cat.slug as cats FROM items i LEFT JOIN creators c ON i.creator_id=c.id LEFT JOIN gallery_categories cat ON i.category_id=cat.id WHERE cat.slug=${cat} ORDER BY i.published_at DESC LIMIT ${lim}::int OFFSET ${off}::int`
      : await sql`SELECT i.*,c.name as cn,c.handle as ch,c.avatar_url as ca,cat.name as catn,cat.slug as cats FROM items i LEFT JOIN creators c ON i.creator_id=c.id LEFT JOIN gallery_categories cat ON i.category_id=cat.id ORDER BY i.published_at DESC LIMIT ${lim}::int OFFSET ${off}::int`;

    const items = rows.map(r => ({
      id: r.id, slug: r.slug, title: r.title, description: r.description, tagline: r.tagline, format: r.format,
      category_id: r.category_id, category_name: r.catn, category_slug: r.cats,
      creator_id: r.creator_id, creator_name: r.cn, creator_handle: r.ch, creator_avatar: r.ca,
      source_url: r.source_url, source_type: r.source_type, cover_url: r.cover_url,
      gallery: typeof r.gallery_json === "string" ? JSON.parse(r.gallery_json) : (r.gallery_json || []),
      tags: typeof r.tags_json === "string" ? JSON.parse(r.tags_json) : (r.tags_json || []),
      stats: typeof r.stats_json === "string" ? JSON.parse(r.stats_json) : (r.stats_json || { views: 0, clicks: 0, copies: 0, outbounds: 0 }),
      rating: r.rating, tool: r.tool, github_url: r.github_url, github_stars: r.github_stars,
      pricing: r.pricing, published_at: r.published_at, created_at: r.created_at,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[items] GET failed", error);
    return NextResponse.json({ items: [], error: "Unable to load items" }, { status: 500 });
  }
}
