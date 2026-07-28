import { isHttpUrl } from "./source-config";
import type { CreativeEntry, CreativeSource } from "./types";

export type ModerationResult =
  | { decision: "approved"; reason: "trusted-source-quality-pass" }
  | { decision: "rejected"; reason: string };

const CREATIVE_TERMS = /\b(?:accessibility|animation|architecture|art|brand(?:ing)?|creative|css|design(?:er|ing)?|development|digital|editorial|experience|figma|font|frontend|graphic|illustration|interaction|interior|interface|logo|motion|product|prototype|render(?:ing)?|research|responsive|site|studio|three[ .-]?js|typography|ui|user experience|ux|visual|web(?:site)?|webgl)\b/i;
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
  const body = `${title} ${normalize(entry.description)}`;
  if (!isHttpUrl(entry.link)) return { decision: "rejected", reason: "invalid-canonical-url" };
  if (!entry.imageUrl || !isHttpUrl(entry.imageUrl)) return { decision: "rejected", reason: "missing-or-invalid-cover-image" };
  if (new URL(entry.imageUrl).protocol !== "https:") return { decision: "rejected", reason: "insecure-cover-image" };
  if (PLACEHOLDER_IMAGE.test(new URL(entry.imageUrl).pathname)) return { decision: "rejected", reason: "non-editorial-cover-image" };
  if (!hasEnoughReadableText(title) || hasExcessiveRepetition(title)) return { decision: "rejected", reason: "low-quality-title" };
  if (UNSAFE_TERMS.test(body)) return { decision: "rejected", reason: "unsafe-topic" };
  if (PROMOTIONAL_TERMS.test(body)) return { decision: "rejected", reason: "promotional-or-non-editorial" };
  if (!CREATIVE_TERMS.test(body)) return { decision: "rejected", reason: "outside-creative-editorial-scope" };
  if (!Number.isFinite(entry.publishedAt) || entry.publishedAt > now + 48 * 60 * 60 * 1_000) return { decision: "rejected", reason: "invalid-publication-date" };
  return { decision: "approved", reason: "trusted-source-quality-pass" };
}
