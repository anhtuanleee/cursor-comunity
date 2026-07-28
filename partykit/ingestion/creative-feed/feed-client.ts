import type { FeedCheckpoint, FeedResponse } from "./types";

const MAX_FEED_BYTES = 2_000_000;
const FETCH_TIMEOUT_MS = 12_000;

export async function fetchFeed(
  url: string,
  checkpoint: FeedCheckpoint,
): Promise<FeedResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const conditionalHeaders: Record<string, string> = {};
    if (checkpoint.etag) {
      conditionalHeaders["If-None-Match"] = checkpoint.etag;
    }
    if (checkpoint.lastModified) {
      conditionalHeaders["If-Modified-Since"] = checkpoint.lastModified;
    }

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept:
          "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9",
        "User-Agent": "CursorCommunityBot/1.0 (+public-feed-sync)",
        ...conditionalHeaders,
      },
    });

    if (response.status === 304) {
      return {
        body: "",
        etag: checkpoint.etag,
        lastModified: checkpoint.lastModified,
        notModified: true,
      };
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const declaredLength = Number(response.headers.get("content-length"));
    if (
      Number.isFinite(declaredLength) &&
      declaredLength > MAX_FEED_BYTES
    ) {
      throw new Error("Feed exceeds 2MB safety limit");
    }

    const metadata = {
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
    };
    if (!response.body) {
      return { body: "", notModified: false, ...metadata };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let bytesRead = 0;
    let body = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytesRead += chunk.value.byteLength;
      if (bytesRead > MAX_FEED_BYTES) {
        await reader.cancel("Feed exceeds safety limit");
        throw new Error("Feed exceeds 2MB safety limit");
      }
      body += decoder.decode(chunk.value, { stream: true });
    }

    return {
      body: body + decoder.decode(),
      notModified: false,
      ...metadata,
    };
  } finally {
    clearTimeout(timeout);
  }
}
