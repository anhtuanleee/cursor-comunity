import type { CreativeSource } from "./types";

export const CURATED_CREATIVE_SOURCES: CreativeSource[] = [
  {
    name: "Codrops",
    url: "https://tympanus.net/codrops/feed/",
    category: "Creative Development",
    tags: ["creative-development", "web-design", "motion"],
    resolvePageImage: true,
  },
  {
    name: "Sidebar",
    url: "https://sidebar.io/feed.xml",
    category: "Design Resources",
    tags: ["design", "resources", "curated"],
    resolvePageImage: true,
  },
  {
    name: "One Page Love",
    url: "https://onepagelove.com/feed",
    category: "Website Inspiration",
    tags: ["landing-page", "web-design", "inspiration"],
    resolvePageImage: true,
  },
];

// This is the default source registry. Runtime feeds configured through
// CREATIVE_FEEDS go through the same automated content, media, and author
// gates before they can be published.
for (const source of CURATED_CREATIVE_SOURCES) {
  source.autoPublish = true;
}
