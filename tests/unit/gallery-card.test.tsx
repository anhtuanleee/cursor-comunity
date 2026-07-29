import { fireEvent, render, screen } from "@testing-library/react";
import { GalleryCard } from "@/components/gallery/gallery-card";
import type { GalleryItem } from "@/lib/types";

const push = jest.fn();

jest.mock("@/lib/view-transition", () => ({
  ViewTransition: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href} {...props}>{children}</a>,
}));

jest.mock("@/components/ui/media-cover", () => ({
  MediaCover: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} />
  ),
}));

const item: GalleryItem = {
  id: "item-1",
  slug: "123e4567-e89b-52d3-a456-426614174000",
  title: "A motion-led creative reference",
  description: "A curated website with an editorial interaction system.",
  tagline: null,
  format: "creative",
  category_id: "creative-content",
  category_name: "Creative Development",
  category_slug: "creative-development",
  creator_id: "",
  creator_name: "Studio",
  creator_handle: "",
  creator_avatar: "",
  source_url: "https://studio.test/reference",
  source_type: "creative-feed",
  cover_url: "https://studio.test/cover.jpg",
  gallery: [{ url: "https://studio.test/cover.jpg", width: 4, height: 5 }],
  tags: [],
  stats: { views: 0, clicks: 0, copies: 0, outbounds: 0 },
  rating: null,
  tool: null,
  github_url: null,
  github_stars: null,
  pricing: null,
  published_at: Date.now(),
  created_at: Date.now(),
};

describe("GalleryCard", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("renders a full-card detail link", () => {
    render(
      <GalleryCard
        item={item}
        href={`/${item.slug}`}
        onCommentClick={jest.fn()}
      />,
    );

    const link = screen.getByRole("link", {
      name: "Open A motion-led creative reference",
    });
    expect(link).toHaveClass("absolute", "inset-0");
    expect(link).toHaveAttribute("href", `/${item.slug}`);
  });

  it("keeps card actions outside the detail navigation", () => {
    const onFocus = jest.fn();
    const onCommentClick = jest.fn();
    render(
      <GalleryCard
        item={item}
        href={`/${item.slug}`}
        onCommentClick={onCommentClick}
        onFocus={onFocus}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Focus together" }));
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));

    expect(onFocus).toHaveBeenCalledWith(item);
    expect(onCommentClick).toHaveBeenCalledWith(item);
    expect(push).not.toHaveBeenCalled();
  });
});
