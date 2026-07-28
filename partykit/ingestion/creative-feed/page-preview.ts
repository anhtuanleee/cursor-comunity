import { absoluteUrl, isHttpUrl } from "./source-config";
import type { CreativeEntry, CreativeSource } from "./types";

const FETCH_TIMEOUT_MS = 7_000;
const MAX_PAGE_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const PREVIEW_CONCURRENCY = 4;

function metaContent(html: string, key: string): string {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const byKeyFirst = html.match(new RegExp(
    `<meta\\b[^>]*(?:property|name)=["']${escapedKey}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "i",
  ));
  if (byKeyFirst?.[1]) return byKeyFirst[1];

  const byContentFirst = html.match(new RegExp(
    `<meta\\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${escapedKey}["'][^>]*>`,
    "i",
  ));
  return byContentFirst?.[1] ?? "";
}

async function fetchSameOriginHtml(
  initialUrl: string,
  allowedHostname: string,
): Promise<{ body: string; finalUrl: string } | null> {
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const parsed = new URL(currentUrl);
    if (
      !isHttpUrl(currentUrl) ||
      parsed.hostname !== allowedHostname
    ) {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "CursorCommunityBot/1.0 (+link-preview)",
        },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) return null;
        currentUrl = absoluteUrl(location, currentUrl);
        continue;
      }
      if (!response.ok) return null;

      const declaredLength = Number(response.headers.get("content-length"));
      if (
        Number.isFinite(declaredLength) &&
        declaredLength > MAX_PAGE_BYTES
      ) {
        return null;
      }

      const body = await response.text();
      if (new TextEncoder().encode(body).byteLength > MAX_PAGE_BYTES) {
        return null;
      }
      return { body, finalUrl: currentUrl };
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}

async function resolveEntryImage(
  entry: CreativeEntry,
  source: CreativeSource,
): Promise<CreativeEntry> {
  if (entry.imageUrl || !source.resolvePageImage) return entry;

  const allowedHostname = new URL(source.url).hostname;
  let page: Awaited<ReturnType<typeof fetchSameOriginHtml>>;
  try {
    page = await fetchSameOriginHtml(entry.link, allowedHostname);
  } catch {
    return entry;
  }
  if (!page) return entry;

  const candidate =
    metaContent(page.body, "og:image") ||
    metaContent(page.body, "twitter:image");
  const imageUrl = absoluteUrl(
    candidate.replace(/&amp;/g, "&"),
    page.finalUrl,
  );
  return isHttpUrl(imageUrl) ? { ...entry, imageUrl } : entry;
}

export async function enrichEntryImages(
  entries: CreativeEntry[],
  source: CreativeSource,
): Promise<CreativeEntry[]> {
  const enriched: CreativeEntry[] = [];
  for (let index = 0; index < entries.length; index += PREVIEW_CONCURRENCY) {
    const batch = entries.slice(index, index + PREVIEW_CONCURRENCY);
    enriched.push(...await Promise.all(
      batch.map(entry => resolveEntryImage(entry, source)),
    ));
  }
  return enriched;
}
