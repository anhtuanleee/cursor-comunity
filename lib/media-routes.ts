export type MediaAsset = "cover" | "avatar" | number;

export function galleryMediaUrl(
  itemId: string,
  asset: MediaAsset,
  kind?: "video",
): string {
  const url = `/media/${encodeURIComponent(itemId)}/${asset}`;
  return kind === "video" ? `${url}?kind=video` : url;
}

export function galleryOutboundUrl(itemId: string): string {
  return `/out/${encodeURIComponent(itemId)}`;
}
