import type { CreativeSource } from "./types";

export function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function absoluteUrl(value: string, base: string): string {
  if (!value) return "";
  try {
    return new URL(value, base).toString();
  } catch {
    return "";
  }
}

export function parseSources(raw: string | undefined): CreativeSource[] {
  if (!raw?.trim()) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.flatMap(value => {
        if (typeof value === "string") return [{ url: value }];
        if (!value || typeof value !== "object") return [];
        const source = value as Record<string, unknown>;
        if (typeof source.url !== "string") return [];
        return [{
          url: source.url,
          name:
            typeof source.name === "string"
              ? source.name.slice(0, 120)
              : undefined,
          category:
            typeof source.category === "string"
              ? source.category
              : undefined,
          tags: Array.isArray(source.tags)
            ? source.tags
                .filter((tag): tag is string => typeof tag === "string")
                .slice(0, 10)
            : undefined,
          resolvePageImage:
            source.resolvePageImage === true
              ? true
              : undefined,
          autoPublish: false,
        }];
      });
    }
  } catch {
    // Comma-separated configuration is supported for simple deployments.
  }

  return raw
    .split(",")
    .map(url => ({ url: url.trim(), autoPublish: false }))
    .filter(source => isHttpUrl(source.url));
}

export function mergeSources(
  defaults: CreativeSource[],
  configured: CreativeSource[],
): CreativeSource[] {
  const byUrl = new Map<string, CreativeSource>();
  for (const source of [...defaults, ...configured]) {
    if (!isHttpUrl(source.url)) continue;
    const normalizedUrl = new URL(source.url).toString();
    const previous = byUrl.get(normalizedUrl);
    byUrl.set(normalizedUrl, {
      ...previous,
      ...source,
      url: normalizedUrl,
      // A configured feed cannot inherit source trust; every individual item
      // is still evaluated by the automated creative moderation gate.
      autoPublish: previous?.autoPublish === true || source.autoPublish === true,
    });
  }
  return [...byUrl.values()];
}
