import { isHttpUrl } from "./source-config";
import type { CreativeEntry, CreativeSource } from "./types";

export type ModerationResult =
  | {
      decision: "approved";
      reason: "trusted-source-quality-pass" | "motion-priority-pass";
    }
  | { decision: "rejected"; reason: string };

const WEBSITE_TERMS = /\b(?:accessibility|browser|canvas|cms|codepen|creative cod(?:e|ing)|css|e-?commerce|frontend|home ?page|html|interaction design|interface|javascript|landing page|microsite|navigation|next[ .-]?js|portfolio|responsive|scroll|shopify|site|three[ .-]?js|ui|user interface|web(?:flow|gl|site)?|wordpress)\b/gi;
const MOTION_TERMS = /\b(?:animated?|animation|canvas|generative|gif|interactive|lottie|motion|reel|scroll[- ]?animation|shader|three[ .-]?js|video|webgl)\b/i;
const CREATIVE_TERMS = /\b(?:animation|creative|design(?:er|ing)?|digital|editorial|experience|figma|font|graphic|interaction|interface|motion|prototype|studio|typography|ui|ux|visual|web(?:site)?)\b/gi;
const PROMOTIONAL_TERMS = /\b(?:advertorial|black friday|coupon|discount|giveaway|hiring|job(?:s)?|newsletter|podcast|sponsored|subscribe|ticket(?:s)?|webinar)\b/i;
const UNSAFE_TERMS = /\b(?:casino|gambling|nsfw|porn(?:ography)?|sex(?:ual)?)\b/i;
const PLACEHOLDER_IMAGE = /(?:^|[\/_-])(?:ad(?:vert)?|avatar|author|default|favicon|icon|logo|pixel|placeholder|profile|tracking)(?:[\/_?.-]|$)/i;

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function hasEnoughReadableText(value: string) {
  const compact = value.replace(/\s/g, "");
  if (compact.length < 8 || compact.length > 240) return false;
  const readable = (compact.match(/[\p{L}\p{N}]/gu) ?? []).length;
  return readable / compact.length >= 0.55;
}

function hasExcessiveRepetition(value: string) {
  return /(.)\1{5,}/u.test(value) || /\b(\w+)\s+\1\s+\1\b/i.test(value);
}

/** Runs before optional AI enrichment, so a model can never publish an item. */
export function moderateCreativeEntry(
  entry: CreativeEntry,
  source: CreativeSource,
  now = Date.now(),
): ModerationResult {
  if (!source.autoPublish) {
    return { decision: "rejected", reason: "source-awaiting-editorial-approval" };
  }

  const title = normalize(entry.title);
  // Source metadata is deliberately excluded: a feed tagged "design" must
  // not make an unrelated architecture/fashion/news article pass.
  const body = `${title} ${normalize(entry.description)}`;
  const coverUrl = entry.imageUrl ?? (
    entry.mediaKind === "video" || entry.mediaKind === "gif"
      ? entry.mediaUrl
      : null
  );
  if (!isHttpUrl(entry.link)) return { decision: "rejected", reason: "invalid-canonical-url" };
  if (!coverUrl || !isHttpUrl(coverUrl)) return { decision: "rejected", reason: "missing-or-invalid-cover-media" };
  if (new URL(coverUrl).protocol !== "https:") return { decision: "rejected", reason: "insecure-cover-media" };
  if (PLACEHOLDER_IMAGE.test(new URL(coverUrl).pathname)) return { decision: "rejected", reason: "non-editorial-cover-media" };
  if (!hasEnoughReadableText(title) || hasExcessiveRepetition(title)) return { decision: "rejected", reason: "low-quality-title" };
  if (UNSAFE_TERMS.test(body)) return { decision: "rejected", reason: "unsafe-topic" };
  if (PROMOTIONAL_TERMS.test(body)) return { decision: "rejected", reason: "promotional-or-non-editorial" };
  const websiteSignalCount = new Set(
    body.match(WEBSITE_TERMS)?.map(value => value.toLowerCase()) ?? [],
  ).size;
  const creativeSignalCount = new Set(
    body.match(CREATIVE_TERMS)?.map(value => value.toLowerCase()) ?? [],
  ).size;
  const motion = entry.mediaKind === "video" || entry.mediaKind === "gif" || entry.mediaKind === "lottie" || MOTION_TERMS.test(body);
  if (websiteSignalCount === 0) return { decision: "rejected", reason: "outside-creative-website-scope" };
  if (creativeSignalCount === 0) return { decision: "rejected", reason: "insufficient-creative-signal" };
  if (!Number.isFinite(entry.publishedAt) || entry.publishedAt > now + 48 * 60 * 60 * 1_000) return { decision: "rejected", reason: "invalid-publication-date" };
  return {
    decision: "approved",
    reason: motion ? "motion-priority-pass" : "trusted-source-quality-pass",
  };
}
