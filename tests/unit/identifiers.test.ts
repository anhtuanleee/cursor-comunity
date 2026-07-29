import { itemSlug } from "@/partykit/ingestion/creative-feed/identifiers";

describe("itemSlug", () => {
  it("creates a stable UUID-only public slug", () => {
    const link = "https://example.com/creative-reference";
    const slug = itemSlug(link);

    expect(slug).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(slug).not.toContain("creative");
    expect(itemSlug(link)).toBe(slug);
  });
});
