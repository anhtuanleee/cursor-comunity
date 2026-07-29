import { extractPageImages } from "@/partykit/ingestion/creative-feed/page-preview";

describe("extractPageImages", () => {
  it("extracts structured editorial media and skips placeholders", () => {
    const html = `
      <meta property="og:image" content="/social/share.jpg">
      <picture class="hero-project">
        <source srcset="/hero-small.jpg 640w, /hero-large.jpg 1440w">
        <img src="/hero-fallback.jpg" alt="Project hero" width="1440" height="900">
      </picture>
      <img src="/logo.svg" alt="Logo">
      <img data-src="/detail.jpg" class="project-detail" alt="Detail" width="800" height="600">
      <video poster="/motion-poster.jpg"></video>
      <script type="application/ld+json">
        {"@type":"CreativeWork","image":["/json-image.jpg"]}
      </script>
    `;

    const images = extractPageImages(html, "https://studio.test/project");

    expect(images.map(image => image.url)).toEqual([
      "https://studio.test/social/share.jpg",
      "https://studio.test/hero-large.jpg",
      "https://studio.test/hero-fallback.jpg",
      "https://studio.test/detail.jpg",
      "https://studio.test/motion-poster.jpg",
      "https://studio.test/json-image.jpg",
    ]);
    expect(images.find(image => image.url.endsWith("hero-large.jpg"))?.role).toBe("hero");
    expect(images.find(image => image.url.endsWith("detail.jpg"))?.width).toBe(800);
    expect(images.find(image => image.url.endsWith("motion-poster.jpg"))?.role).toBe("video-poster");
    expect(images.some(image => image.url.endsWith("logo.svg"))).toBe(false);
  });
});
