import { createHash } from "node:crypto";

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function itemId(link: string): string {
  return `creative-${hash(link).slice(0, 24)}`;
}

/**
 * A deterministic UUIDv5-shaped public identifier. The database item id stays
 * stable for backwards compatibility; this value is used for the public slug
 * so URLs never expose a title or the internal `creative-` prefix.
 */
export function itemSlug(link: string): string {
  const namespace = Buffer.from("bf4c5d7e9cd84b7ca05edda8fd3e0b15", "hex");
  const bytes = createHash("sha1")
    .update(namespace)
    .update(link)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = bytes.toString("hex");
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export function sourceId(url: string): string {
  return `source-${hash(url).slice(0, 24)}`;
}

export function payloadChecksum(payload: string): string {
  return hash(payload);
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "creative"
  );
}
