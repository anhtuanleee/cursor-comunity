import type { CreativeEntry, CreativeSource } from "./types";

export type CreativeGalleryCategory = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
};

export const CREATIVE_GALLERY_CATEGORIES = {
  website: {
    id: "creative-website-inspiration",
    slug: "website-inspiration",
    name: "Website Inspiration",
    sortOrder: 110,
  },
  uiux: {
    id: "creative-ui-ux-product",
    slug: "ui-ux-product",
    name: "UI/UX & Product",
    sortOrder: 120,
  },
  motion: {
    id: "creative-motion-code",
    slug: "motion-creative-code",
    name: "Motion & Creative Code",
    sortOrder: 130,
  },
  frontend: {
    id: "creative-frontend-development",
    slug: "frontend-development",
    name: "Frontend Development",
    sortOrder: 140,
  },
  branding: {
    id: "creative-branding-identity",
    slug: "branding-visual-identity",
    name: "Branding & Visual Identity",
    sortOrder: 150,
  },
  resources: {
    id: "creative-design-resources",
    slug: "design-resources",
    name: "Design Resources",
    sortOrder: 160,
  },
} as const satisfies Record<string, CreativeGalleryCategory>;

export function sourceCategoryFallback(
  source: Pick<CreativeSource, "category" | "tags">,
): CreativeGalleryCategory {
  const hint = `${source.category ?? ""} ${(source.tags ?? []).join(" ")}`.toLowerCase();
  if (/\b(?:ui|ux|product|research)\b/.test(hint)) return CREATIVE_GALLERY_CATEGORIES.uiux;
  if (/\b(?:motion|creative-development|webgl)\b/.test(hint)) return CREATIVE_GALLERY_CATEGORIES.motion;
  if (/\b(?:frontend|development|webflow)\b/.test(hint)) return CREATIVE_GALLERY_CATEGORIES.frontend;
  if (/\b(?:brand|creative direction|visual)\b/.test(hint)) return CREATIVE_GALLERY_CATEGORIES.branding;
  if (/\b(?:resource|curated)\b/.test(hint)) return CREATIVE_GALLERY_CATEGORIES.resources;
  return CREATIVE_GALLERY_CATEGORIES.website;
}

const CATEGORY_SIGNALS: Array<{
  category: CreativeGalleryCategory;
  pattern: RegExp;
  weight: number;
}> = [
  {
    category: CREATIVE_GALLERY_CATEGORIES.uiux,
    pattern: /\b(?:ui|ux|user experience|user interface|product design|usability|prototype|wireframe|design system|interaction design)\b/gi,
    weight: 3,
  },
  {
    category: CREATIVE_GALLERY_CATEGORIES.motion,
    pattern: /\b(?:animation|animated|creative coding|generative|gsap|lottie|motion|shader|three(?:\.| )?js|webgl)\b/gi,
    weight: 3,
  },
  {
    category: CREATIVE_GALLERY_CATEGORIES.frontend,
    pattern: /\b(?:accessibility|css|frontend|html|javascript|react|next(?:\.| )?js|scroll|web development|webflow development)\b/gi,
    weight: 2,
  },
  {
    category: CREATIVE_GALLERY_CATEGORIES.branding,
    pattern: /\b(?:art direction|brand(?:ing)?|editorial|identity|illustration|logo|typeface|typography|visual identity)\b/gi,
    weight: 2,
  },
  {
    category: CREATIVE_GALLERY_CATEGORIES.resources,
    pattern: /\b(?:collection|component|design resource|font|freebie|guide|icon|resource|template|toolkit)\b/gi,
    weight: 2,
  },
  {
    category: CREATIVE_GALLERY_CATEGORIES.website,
    pattern: /\b(?:award|case study|homepage|landing page|microsite|portfolio|site of the day|website|web site)\b/gi,
    weight: 2,
  },
];

function score(text: string, category: CreativeGalleryCategory): number {
  return CATEGORY_SIGNALS
    .filter(signal => signal.category.id === category.id)
    .reduce((total, signal) => {
      const matches = text.match(signal.pattern) ?? [];
      return total + Math.min(matches.length, 3) * signal.weight;
    }, 0);
}

export function classifyCreativeEntry(
  entry: Pick<CreativeEntry, "title" | "description" | "mediaKind">,
  tags: string[],
  fallback: CreativeGalleryCategory = CREATIVE_GALLERY_CATEGORIES.website,
): CreativeGalleryCategory {
  const text = `${entry.title} ${entry.description} ${tags.join(" ")}`.toLowerCase();
  const scores = new Map<string, number>(
    Object.values(CREATIVE_GALLERY_CATEGORIES)
      .map(category => [category.id, score(text, category)]),
  );
  if (entry.mediaKind === "video" || entry.mediaKind === "gif" || entry.mediaKind === "lottie") {
    scores.set(
      CREATIVE_GALLERY_CATEGORIES.motion.id,
      (scores.get(CREATIVE_GALLERY_CATEGORIES.motion.id) ?? 0) + 5,
    );
  }

  return Object.values(CREATIVE_GALLERY_CATEGORIES).reduce((winner, category) =>
    (scores.get(category.id) ?? 0) > (scores.get(winner.id) ?? 0)
      ? category
      : winner,
  fallback);
}
