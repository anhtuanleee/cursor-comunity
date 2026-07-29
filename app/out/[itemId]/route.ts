import { NextResponse } from "next/server";
import { getGalleryOutboundTarget } from "@/server/gallery/gallery.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getOutboundUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const { itemId } = await params;
  if (!itemId || itemId.length > 128) return new NextResponse(null, { status: 404 });

  const target = await getGalleryOutboundTarget(itemId);
  const url = target ? getOutboundUrl(target) : null;
  if (!url) return new NextResponse(null, { status: 404 });

  return NextResponse.redirect(url, {
    status: 302,
    headers: { "Referrer-Policy": "no-referrer" },
  });
}
