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
    .replace(/&#39;/g, "'")
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

    const dateValue = firstTag(block, [
      "pubDate",
      "published",
      "updated",
      "dc:date",
    ]);
    const parsedDate = Date.parse(dateValue);
    return [{
      title: title.slice(0, 240),
      link,
      description: firstTag(block, [
        "description",
        "summary",
        "content:encoded",
      ]).slice(0, 4_000),
      imageUrl: parseImage(block, sourceUrl),
      publishedAt: Number.isFinite(parsedDate) ? parsedDate : Date.now(),
    }];
  });
}
