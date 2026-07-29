import { galleryMediaUrl, galleryOutboundUrl } from "@/lib/media-routes";

describe("gallery media routes", () => {
  it("uses opaque same-origin paths for crawled media and outbound sources", () => {
    const itemId = "creative/ref?one";

    expect(galleryMediaUrl(itemId, "cover")).toBe("/media/creative%2Fref%3Fone/cover");
    expect(galleryMediaUrl(itemId, 2, "video")).toBe("/media/creative%2Fref%3Fone/2?kind=video");
    expect(galleryOutboundUrl(itemId)).toBe("/out/creative%2Fref%3Fone");
  });
});
