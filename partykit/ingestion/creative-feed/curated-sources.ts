import type { CreativeSource } from "./types";

export const CURATED_CREATIVE_SOURCES: CreativeSource[] = [
  {
    name: "Awwwards",
    url: "https://www.awwwards.com/blog/feed/",
    category: "Website Inspiration",
    tags: ["web-design", "inspiration", "digital-experience"],
    resolvePageImage: true,
  },
  {
    name: "Codrops",
    url: "https://tympanus.net/codrops/feed/",
    category: "Creative Development",
    tags: ["creative-development", "web-design", "motion"],
    resolvePageImage: true,
  },
  {
    name: "Creative Boom",
    url: "https://www.creativeboom.com/feed/",
    category: "Creative Direction",
    tags: ["creative", "branding", "visual-design"],
    resolvePageImage: true,
  },
  {
    name: "Muzli Magazine",
    url: "https://medium.muz.li/feed",
    category: "Design Inspiration",
    tags: ["ui-ux", "design", "inspiration"],
    resolvePageImage: true,
  },
  {
    name: "Sidebar",
    url: "https://sidebar.io/feed.xml",
    category: "Design Resources",
    tags: ["design", "resources", "curated"],
    resolvePageImage: true,
    // Sidebar is a trusted directory: its RSS entries link to external design
    // sites, so its cover can only be resolved from that destination.
    allowExternalPreview: true,
  },
  {
    name: "One Page Love",
    url: "https://onepagelove.com/feed",
    category: "Website Inspiration",
    tags: ["landing-page", "web-design", "inspiration"],
    resolvePageImage: true,
  },
  {
    name: "Smashing Magazine",
    url: "https://www.smashingmagazine.com/feed/",
    category: "UI UX & Frontend",
    tags: ["ui-ux", "frontend", "web-design"],
    resolvePageImage: true,
  },
  {
    name: "Speckyboy",
    url: "https://speckyboy.com/feed/",
    category: "Web Design Resources",
    tags: ["web-design", "ui-ux", "resources"],
    resolvePageImage: true,
  },
  {
    name: "UX Collective",
    url: "https://uxdesign.cc/feed",
    category: "UI UX",
    tags: ["ui-ux", "product-design", "research"],
    resolvePageImage: true,
  },
  {
    name: "Webdesigner Depot",
    url: "https://www.webdesignerdepot.com/feed/",
    category: "Web Design",
    tags: ["web-design", "frontend", "design"],
    resolvePageImage: true,
  },
  {
    name: "Webflow Blog",
    url: "https://webflow.com/blog/rss.xml",
    category: "Website Creation",
    tags: ["webflow", "web-design", "development"],
    resolvePageImage: true,
  },
];

// This is the default source registry. Runtime feeds configured through
// CREATIVE_FEEDS go through the same automated content, media, and author
// gates before they can be published.
for (const source of CURATED_CREATIVE_SOURCES) {
  source.autoPublish = true;
}
