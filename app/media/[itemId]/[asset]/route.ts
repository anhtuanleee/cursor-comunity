import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import { getGalleryMediaTarget } from "@/server/gallery/gallery.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;

function isPrivateAddress(address: string): boolean {
  if (address === "::1" || address === "0.0.0.0" || address === "::") return true;
  if (address.startsWith("fe80:") || address.startsWith("fc") || address.startsWith("fd")) return true;
  if (!address.includes(".")) return false;

  const [first, second] = address.split(".").map(Number);
  return first === 10 || first === 127 || first === 0 || first === 169 && second === 254 || first === 172 && second >= 16 && second <= 31 || first === 192 && second === 168;
}

async function getPublicUrl(value: string): Promise<URL | null> {
  try {
    const url = new URL(value);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return null;

    if (isIP(host)) return isPrivateAddress(host) ? null : url;
    const addresses = await lookup(host, { all: true, verbatim: true });
    return addresses.length > 0 && addresses.every(({ address }) => !isPrivateAddress(address)) ? url : null;
  } catch {
    return null;
  }
}

function proxyHeaders(response: Response): Headers {
  const headers = new Headers({
    "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "same-origin",
  });
  for (const name of ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string; asset: string }> },
) {
  const { itemId, asset } = await params;
  if (!itemId || itemId.length > 128 || !/^(cover|avatar|\d+)$/.test(asset)) {
    return new NextResponse(null, { status: 404 });
  }

  const target = await getGalleryMediaTarget(itemId, asset);
  if (!target) return new NextResponse(null, { status: 404 });

  const url = await getPublicUrl(target.url);
  if (!url) return new NextResponse(null, { status: 404 });

  try {
    const range = request.headers.get("range");
    const upstream = await fetch(url, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*;q=0.8,video/*;q=0.7,*/*;q=0.1",
        ...(range ? { Range: range } : {}),
      },
      redirect: "error",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const contentType = upstream.headers.get("content-type")?.toLowerCase() || "";
    const contentLength = Number(upstream.headers.get("content-length") || "0");

    if (!upstream.ok || (!contentType.startsWith("image/") && !contentType.startsWith("video/")) || contentLength > MAX_MEDIA_BYTES) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: proxyHeaders(upstream),
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
