import { moderateCreativeEntry } from "@/partykit/ingestion/creative-feed/moderation";
import { parseFeed } from "@/partykit/ingestion/creative-feed/feed-parser";
import type { CreativeEntry } from "@/partykit/ingestion/creative-feed/types";

const NOW = Date.UTC(2026, 6, 30);

function creativeEntry(overrides: Partial<CreativeEntry> = {}): CreativeEntry {
  return {
    title: "A creative UI system for responsive web navigation",
    author: "Ada Designer",
    link: "https://studio.example/work/navigation",
    description: "An interaction design and frontend UI case study.",
    imageUrl: "https://studio.example/images/navigation-cover.jpg",
    mediaUrl: "https://studio.example/images/navigation-cover.jpg",
    mediaKind: "image",
    publishedAt: NOW,
    ...overrides,
  };
}

describe("creative feed automated moderation", () => {
  it("publishes a creative UI entry from a configured source", () => {
    expect(moderateCreativeEntry(creativeEntry(), NOW)).toEqual({
      decision: "approved",
      reason: "automated-creative-quality-pass",
    });
  });

  it("requires an editorial cover and an identifiable author", () => {
    expect(moderateCreativeEntry(creativeEntry({ author: null }), NOW)).toEqual({
      decision: "rejected",
      reason: "missing-or-invalid-author",
    });
    expect(moderateCreativeEntry(creativeEntry({ imageUrl: null, mediaUrl: null }), NOW)).toEqual({
      decision: "rejected",
      reason: "missing-or-invalid-cover-media",
    });
  });

  it("extracts dc:creator from RSS entries", () => {
    const [entry] = parseFeed(`
      <rss><channel><item>
        <title>Creative UI</title>
        <link>https://studio.example/ui</link>
        <dc:creator>Alex Studio</dc:creator>
        <description>UI design</description>
        <media:thumbnail url="https://studio.example/cover.jpg" />
        <pubDate>Wed, 30 Jul 2026 00:00:00 GMT</pubDate>
      </item></channel></rss>
    `, "https://studio.example/feed.xml");

    expect(entry?.author).toBe("Alex Studio");
  });
});
