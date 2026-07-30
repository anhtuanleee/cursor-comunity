import {
  CREATIVE_GALLERY_CATEGORIES,
  classifyCreativeEntry,
  sourceCategoryFallback,
} from "@/partykit/ingestion/creative-feed/classification";

describe("creative gallery classification", () => {
  it("prioritizes motion media over a generic website signal", () => {
    expect(classifyCreativeEntry({
      title: "A portfolio website",
      description: "An interactive visual experience.",
      mediaKind: "video",
    }, [])).toBe(CREATIVE_GALLERY_CATEGORIES.motion);
  });

  it("uses content and tags rather than the publisher name", () => {
    expect(classifyCreativeEntry({
      title: "How to audit a product onboarding flow",
      description: "Practical UX research and user interface design.",
      mediaKind: "image",
    }, ["design systems"])).toBe(CREATIVE_GALLERY_CATEGORIES.uiux);
  });

  it("classifies branding references separately from frontend work", () => {
    expect(classifyCreativeEntry({
      title: "A visual identity for a cultural studio",
      description: "Branding, editorial typography, and art direction.",
      mediaKind: "image",
    }, [])).toBe(CREATIVE_GALLERY_CATEGORIES.branding);
  });

  it("uses the source only when an item has no classification signal", () => {
    expect(classifyCreativeEntry({
      title: "Untitled selection",
      description: "",
      mediaKind: "image",
    }, [], sourceCategoryFallback({
      category: "Design Resources",
      tags: ["curated"],
    }))).toBe(CREATIVE_GALLERY_CATEGORIES.resources);
  });
});
