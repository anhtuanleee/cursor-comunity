import { NextRequest, NextResponse } from "next/server";
import { getGalleryPage } from "@/server/gallery/gallery.service";
import { logRouteError } from "@/server/http/responses";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cat = req.nextUrl.searchParams.get("category");
  const requestedLimit = Number.parseInt(req.nextUrl.searchParams.get("limit") || "20", 10);
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 20;
  const cursor = req.nextUrl.searchParams.get("cursor");

  try {
    const page = await getGalleryPage({ category: cat, cursor, limit });
    return NextResponse.json(page);
  } catch (error) {
    logRouteError("gallery.list", error);
    return NextResponse.json({ items: [], error: "Unable to load items" }, { status: 500 });
  }
}
