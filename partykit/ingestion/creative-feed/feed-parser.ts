import { absoluteUrl, isHttpUrl } from "./source-config";
import type { CreativeEntry } from "./types";

const MAX_ENTRIES_PER_SOURCE = 40;

function decodeHtml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/\s+/g, " ")
    .trim();
}

function firstTag(block: string, names: string[]): string {
  for (const name of names) {
    const match = block.match(
      new RegExp(
        `<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,
        "i",
      ),
    );
    if (match?.[1]) return decodeHtml(match[1]);
  }
  return "";
}

function firstAttribute(
  block: string,
  names: string[],
  attribute: string,
): string {
  for (const name of names) {
    const match = block.match(
      new RegExp(
        `<${name}\\b[^>]*\\b${attribute}=["']([^"']+)["'][^>]*\\/?>`,
        "i",
      ),
    );
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function mediaKind(url: string, type = ""):
  "image" | "video" | "gif" | "lottie" {
  const value = `${url} ${type}`.toLowerCase();
  if (/(?:video\/|\.(?:mp4|mov|m4v|webm)(?:[?#]|$))/.test(value)) return "video";
  if (/(?:image\/gif|\.gif(?:[?#]|$))/.test(value)) return "gif";
  if (/(?:lottie|application\/json|\.json(?:[?#]|$))/.test(value)) return "lottie";
  return "image";
}

function parseMedia(
  block: string,
  baseUrl: string,
): { url: string; kind: "image" | "video" | "gif" | "lottie" } | null {
  const candidates = [
    block.match(/<(?:media:content|enclosure)\b[^>]*\burl=["']([^"']+)["'][^>]*>/i)?.[1] ?? "",
    block.match(/<(?:video|source|lottie-player)\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/i)?.[1] ?? "",
    block.match(/\b(?:href|src)=["']([^"']+\.(?:mp4|mov|m4v|webm|gif|json|lottie)(?:[?#][^"']*)?)["']/i)?.[1] ?? "",
  ];
  for (const candidate of candidates) {
    const url = absoluteUrl(candidate, baseUrl);
    if (!isHttpUrl(url)) continue;
    const tag = block.match(new RegExp(
      `<(?:media:content|enclosure)[^>]*\burl=["']${candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^>]*>`,
      "i",
    ));
    const type = tag?.[0].match(/\btype=["']([^"']+)["']/i)?.[1] ?? "";
    return { url, kind: mediaKind(url, type || block) };
  }
  return null;
}

function parseImage(block: string, baseUrl: string): string | null {
  const candidates = [
    firstAttribute(
      block,
      ["media:thumbnail", "media:content"],
      "url",
    ),
    firstTag(block, ["media:content", "media:thumbnail"]),
    firstTag(block, ["image", "image:url"]),
    block.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1] ?? "",
  ];
  for (const candidate of candidates) {
    const imageUrl = absoluteUrl(candidate, baseUrl);
    if (
      isHttpUrl(imageUrl) &&
      !/\.(?:mp4|mov|m4v|webm)(?:[?#]|$)/i.test(imageUrl)
    ) {
      return imageUrl;
    }
  }
  return null;
}

export function parseFeed(
  xml: string,
  sourceUrl: string,
): CreativeEntry[] {
  const blocks =
    xml.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) ?? [];

  return blocks.slice(0, MAX_ENTRIES_PER_SOURCE).flatMap(block => {
    const title = firstTag(block, ["title"]);
    const rawLink =
      firstTag(block, ["link"]) ||
      firstAttribute(block, ["link"], "href") ||
      firstTag(block, ["guid", "id"]);
    const link = absoluteUrl(rawLink, sourceUrl);
    if (!title || !isHttpUrl(link)) return [];

    const author = firstTag(block, [
      "dc:creator",
      "author",
      "itunes:author",
      "media:credit",
    ]).replace(/\s+/g, " ").trim();

    const dateValue = firstTag(block, [
      "pubDate",
      "published",
      "updated",
      "dc:date",
    ]);
    const parsedDate = Date.parse(dateValue);
    const media = parseMedia(block, sourceUrl);
    const imageUrl = parseImage(block, sourceUrl);
    return [{
      title: title.slice(0, 240),
      author: author ? author.slice(0, 120) : null,
      link,
      description: firstTag(block, [
        "description",
        "summary",
        "content:encoded",
      ]).slice(0, 4_000),
      imageUrl,
      mediaUrl: media?.url ?? imageUrl,
      mediaKind: media?.kind ?? "image",
      publishedAt: Number.isFinite(parsedDate) ? parsedDate : Date.now(),
    }];
  });
}
