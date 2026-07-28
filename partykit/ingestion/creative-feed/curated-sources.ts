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
  },
  {
    name: "One Page Love",
    url: "https://onepagelove.com/feed",
    category: "Website Inspiration",
    tags: ["landing-page", "web-design", "inspiration"],
  },
  {
    name: "Smashing Magazine",
    url: "https://www.smashingmagazine.com/feed/",
    category: "Design & Frontend",
    tags: ["ux", "frontend", "web-design"],
  },
  {
    name: "Creative Boom",
    url: "https://www.creativeboom.com/feed/",
    category: "Graphic Design",
    tags: ["branding", "illustration", "graphic-design"],
  },
  {
    name: "Design Milk",
    url: "https://design-milk.com/feed/",
    category: "Product & Architecture",
    tags: ["product-design", "interior", "architecture"],
  },
  {
    name: "CSS-Tricks",
    url: "https://css-tricks.com/feed/",
    category: "Design & Frontend",
    tags: ["css", "frontend", "ui"],
  },
  {
    name: "Designboom",
    url: "https://www.designboom.com/feed/",
    category: "Art & Architecture",
    tags: ["art", "design", "architecture"],
  },
  {
    name: "UX Collective",
    url: "https://uxdesign.cc/feed",
    category: "UX & Product",
    tags: ["ux", "product-design", "research"],
  },
  {
    name: "Muzli Magazine",
    url: "https://medium.muz.li/feed",
    category: "Design Inspiration",
    tags: ["design-inspiration", "visual-design", "ui"],
  },
  {
    name: "Speckyboy",
    url: "https://speckyboy.com/feed/",
    category: "Web Design",
    tags: ["web-design", "ui", "resources"],
  },
  {
    name: "Webdesigner Depot",
    url: "https://www.webdesignerdepot.com/feed/",
    category: "Web Design",
    tags: ["web-design", "ui", "frontend"],
  },
  {
    name: "Hongkiat",
    url: "https://hongkiat.com/blog/feed/",
    category: "Design Resources",
    tags: ["design", "development", "resources"],
  },
  {
    name: "Abduzeedo",
    url: "https://feeds.feedburner.com/abduzeedo",
    category: "Visual Design",
    tags: ["branding", "illustration", "3d"],
  },
];

// This is an editorial allow-list, not merely a convenience list. Runtime
// feeds configured through CREATIVE_FEEDS stay in review until moved here.
for (const source of CURATED_CREATIVE_SOURCES) {
  source.autoPublish = true;
}
