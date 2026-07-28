import { notFound } from "next/navigation";
import { ItemDetailModal } from "@/components/gallery/item-detail-modal";
import { getGalleryItem } from "@/server/gallery/gallery.service";

export default async function InterceptedItemDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getGalleryItem(slug);
  if (!item) notFound();

  return <ItemDetailModal item={item} />;
}
