import { absoluteUrl, isHttpUrl } from "./source-config";
import type { CreativeEntry, CreativeImage, CreativeSource } from "./types";

const FETCH_TIMEOUT_MS = 7_000;
const MAX_PAGE_BYTES = 1_000_000;
const MAX_REDIRECTS = 3;
const PREVIEW_CONCURRENCY = 3;
const MAX_PAGE_IMAGES = 12;
const MAX_PREVIEWS_PER_SOURCE = 12;
const PLACEHOLDER_IMAGE = /(?:^|[\/_-])(?:ad(?:vert)?|avatar|author|default|favicon|icon|logo|pixel|placeholder|profile|sprite|tracking)(?:[\/_?.-]|$)/i;

function decodeHtml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)));
}

function attributeValue(tag: string, attribute: string): string {
  const escaped = attribute.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const quoted = tag.match(
    new RegExp(`\\b${escaped}\\s*=\\s*["']([^"']+)["']`, "i"),
  )?.[1];
  if (quoted) return decodeHtml(quoted.trim());
  return tag.match(new RegExp(`\\b${escaped}\\s*=\\s*([^\\s>]+)`, "i"))?.[1] ?? "";
}

function readSrcset(value: string, pageUrl: string): string[] {
  return value
    .split(",")
    .map(candidate => {
      const parts = candidate.trim().split(/\s+/);
      const width = Number.parseInt(parts[1] ?? "", 10);
      return {
        url: absoluteUrl(parts[0] ?? "", pageUrl),
        width: Number.isFinite(width) ? width : 0,
      };
    })
    .filter(candidate => isHttpUrl(candidate.url))
    .sort((a, b) => b.width - a.width)
    .map(candidate => candidate.url);
}

function dimension(tag: string, attribute: string): number {
  const value = Number.parseInt(attributeValue(tag, attribute), 10);
  return Number.isFinite(value) && value > 0 && value < 10_000 ? value : 0;
}

function isEditorialImage(url: string, context = ""): boolean {
  if (!isHttpUrl(url) || new URL(url).protocol !== "https:") return false;
  if (PLACEHOLDER_IMAGE.test(new URL(url).pathname)) return false;
  const signal = `${url} ${context}`.toLowerCase();
  return !/(?:tracking|pixel|beacon|sprite|favicon)/.test(signal);
}

function isPublicPreviewHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/\.$/, "");
  if (!normalized || normalized === "localhost" || normalized.endsWith(".local") || normalized.endsWith(".internal")) {
    return false;
  }
  // An external preview is only enabled for a curated source. Reject private
  // IPv4 literals outright; DNS hosts remain constrained by HTTPS + redirect
  // limits below.
  const octets = normalized.split(".");
  if (octets.length === 4 && octets.every(part => /^\d+$/.test(part))) {
    const numbers = octets.map(Number);
    if (numbers.some(value => value > 255)) return false;
    const [first, second] = numbers;
    if (first === 0 || first === 10 || first === 127 || first >= 224) return false;
    if (first === 169 && second === 254) return false;
    if (first === 172 && second >= 16 && second <= 31) return false;
    if (first === 192 && second === 168) return false;
  }
  return !normalized.includes(":");
}

function roleFor(context: string, fallback: CreativeImage["role"]): CreativeImage["role"] {
  if (/\b(?:og:image|twitter:image|social|share)\b/i.test(context)) return "social";
  if (/\b(?:video|poster)\b/i.test(context)) return "video-poster";
  if (/\b(?:hero|featured|cover|project|case-study|work)\b/i.test(context)) return "hero";
  return fallback;
}

function fromUrl(
  rawUrl: string,
  pageUrl: string,
  source: CreativeImage["source"],
  context: string,
  fallbackRole: CreativeImage["role"],
  tag = "",
): CreativeImage | null {
  const url = absoluteUrl(rawUrl, pageUrl);
  if (!isEditorialImage(url, context)) return null;
  return {
    url,
    width: dimension(tag, "width"),
    height: dimension(tag, "height"),
    role: roleFor(context, fallbackRole),
    source,
    alt: attributeValue(tag, "alt").slice(0, 240) || undefined,
  };
}

function metaContent(html: string, key: string): string {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const byKeyFirst = html.match(new RegExp(
    `<meta\\b[^>]*(?:property|name)=["']${escapedKey}["'][^>]*content=["']([^"']+)["'][^>]*>`,
    "i",
  ));
  if (byKeyFirst?.[1]) return decodeHtml(byKeyFirst[1]);

  const byContentFirst = html.match(new RegExp(
    `<meta\\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${escapedKey}["'][^>]*>`,
    "i",
  ));
  return byContentFirst?.[1] ? decodeHtml(byContentFirst[1]) : "";
}

function collectJsonLdImages(value: unknown, output: string[] = []): string[] {
  if (typeof value === "string") {
    output.push(value);
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectJsonLdImages(item, output);
    return output;
  }
  if (!value || typeof value !== "object") return output;
  const record = value as Record<string, unknown>;
  for (const key of ["image", "contentUrl", "thumbnailUrl"]) {
    if (key in record) collectJsonLdImages(record[key], output);
  }
  return output;
}

export function extractPageImages(html: string, pageUrl: string): CreativeImage[] {
  const images: CreativeImage[] = [];
  const push = (image: CreativeImage | null) => {
    if (!image || images.some(candidate => candidate.url === image.url)) return;
    images.push(image);
  };

  push(fromUrl(
    metaContent(html, "og:image"),
    pageUrl,
    "og:image",
    "og:image social",
    "social",
  ));
  push(fromUrl(
    metaContent(html, "twitter:image"),
    pageUrl,
    "twitter:image",
    "twitter:image social",
    "social",
  ));

  for (const block of html.match(/<picture\b[^>]*>[\s\S]*?<\/picture>/gi) ?? []) {
    const pictureContext = `${block} picture`;
    const sources = block.match(/<(?:source|img)\b[^>]*>/gi) ?? [];
    const sourceTag = sources.at(-1) ?? "";
    const candidates = sources.flatMap(tag => [
      ...readSrcset(attributeValue(tag, "srcset"), pageUrl),
      ...readSrcset(attributeValue(tag, "data-srcset"), pageUrl),
      absoluteUrl(
        attributeValue(tag, "src") ||
          attributeValue(tag, "data-src") ||
          attributeValue(tag, "data-lazy-src"),
        pageUrl,
      ),
    ]);
    push(fromUrl(
      candidates.find(candidate => isEditorialImage(candidate, pictureContext)) ?? "",
      pageUrl,
      "picture",
      pictureContext,
      "hero",
      sourceTag,
    ));
  }

  for (const tag of html.match(/<img\b[^>]*>/gi) ?? []) {
    const candidates = [
      ...readSrcset(attributeValue(tag, "srcset"), pageUrl),
      ...readSrcset(attributeValue(tag, "data-srcset"), pageUrl),
      attributeValue(tag, "src"),
      attributeValue(tag, "data-src"),
      attributeValue(tag, "data-lazy-src"),
      attributeValue(tag, "data-original"),
    ];
    const context = `${tag} ${attributeValue(tag, "class")} ${attributeValue(tag, "alt")}`;
    push(fromUrl(
      candidates.find(candidate =>
        isEditorialImage(absoluteUrl(candidate, pageUrl), context)) ?? "",
      pageUrl,
      "img",
      context,
      images.length === 0 ? "hero" : "gallery",
      tag,
    ));
  }

  for (const tag of html.match(/<video\b[^>]*>/gi) ?? []) {
    push(fromUrl(
      attributeValue(tag, "poster"),
      pageUrl,
      "video",
      `${tag} video poster`,
      "video-poster",
      tag,
    ));
  }

  for (const script of html.match(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi,
  ) ?? []) {
    const json = script
      .replace(/^<script\b[^>]*>/i, "")
      .replace(/<\/script>\s*$/i, "")
      .trim();
    try {
      const value = JSON.parse(json) as unknown;
      for (const url of collectJsonLdImages(value)) {
        push(fromUrl(url, pageUrl, "json-ld", "json-ld image", "gallery"));
      }
    } catch {
      // Invalid JSON-LD is common on marketing pages; other extraction paths
      // remain useful and should not fail the whole preview.
    }
  }

  return images.slice(0, MAX_PAGE_IMAGES);
}

async function readBoundedText(
  response: Response,
  maxBytes: number,
): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let body = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytesRead += chunk.value.byteLength;
    if (bytesRead > maxBytes) {
      await reader.cancel("HTML exceeds safety limit");
      throw new Error("HTML exceeds 1MB safety limit");
    }
    body += decoder.decode(chunk.value, { stream: true });
  }
  return body + decoder.decode();
}

async function fetchPreviewHtml(
  initialUrl: string,
  allowedHostname: string,
  allowExternalPreview: boolean,
): Promise<{ body: string; finalUrl: string } | null> {
  let currentUrl = initialUrl;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const parsed = new URL(currentUrl);
    if (
      !isHttpUrl(currentUrl) ||
      parsed.protocol !== "https:" ||
      !isPublicPreviewHostname(parsed.hostname) ||
      (!allowExternalPreview && parsed.hostname !== allowedHostname)
    ) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: "manual",
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": "CursorCommunityBot/1.0 (+link-preview; contact=admin)",
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
      if (Number.isFinite(declaredLength) && declaredLength > MAX_PAGE_BYTES) return null;
      return { body: await readBoundedText(response, MAX_PAGE_BYTES), finalUrl: currentUrl };
    } finally {
      clearTimeout(timeout);
    }
  }
  return null;
}

async function resolveEntryImages(
  entry: CreativeEntry,
  source: CreativeSource,
): Promise<CreativeEntry> {
  if (!source.resolvePageImage) return entry;

  const allowedHostname = new URL(source.url).hostname;
  let page: Awaited<ReturnType<typeof fetchPreviewHtml>>;
  try {
    page = await fetchPreviewHtml(
      entry.link,
      allowedHostname,
      source.allowExternalPreview === true,
    );
  } catch {
    return entry;
  }
  if (!page) return entry;

  const extracted = extractPageImages(page.body, page.finalUrl);
  const candidates: CreativeImage[] = [
    ...(entry.imageUrl
      ? [{
          url: entry.imageUrl,
          width: 0,
          height: 0,
          role: "hero" as const,
          source: "feed" as const,
        }]
      : []),
    ...extracted,
  ];
  const images = candidates
    .filter(candidate => isEditorialImage(candidate.url, candidate.alt ?? ""))
    .filter((candidate, index, list) =>
      list.findIndex(item => item.url === candidate.url) === index)
    .slice(0, MAX_PAGE_IMAGES);
  const cover = images.find(image => image.role === "hero") ??
    images.find(image => image.role === "gallery" || image.role === "video-poster") ??
    images[0];
  return {
    ...entry,
    imageUrl: cover?.url ?? entry.imageUrl,
    images,
  };
}

export async function enrichEntryImages(
  entries: CreativeEntry[],
  source: CreativeSource,
): Promise<CreativeEntry[]> {
  if (!source.resolvePageImage) return entries;

  const previewable = entries
    .map((entry, index) => ({ entry, index }))
    // Existing RSS media already satisfies the cover gate. Do not spend a
    // network request on every article just to enlarge its gallery.
    .filter(({ entry }) => !entry.imageUrl && !entry.mediaUrl)
    .slice(0, MAX_PREVIEWS_PER_SOURCE);
  if (!previewable.length) return entries;

  const resolved = new Map<number, CreativeEntry>();
  for (let index = 0; index < previewable.length; index += PREVIEW_CONCURRENCY) {
    const batch = previewable.slice(index, index + PREVIEW_CONCURRENCY);
    const resolvedBatch = await Promise.all(
      batch.map(({ entry }) => resolveEntryImages(entry, source)),
    );
    batch.forEach(({ index: entryIndex }, batchIndex) => {
      resolved.set(entryIndex, resolvedBatch[batchIndex]);
    });
  }
  return entries.map((entry, index) => resolved.get(index) ?? entry);
}
