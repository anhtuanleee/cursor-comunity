import { notFound } from "next/navigation";
import { ItemDetailContent } from "@/components/gallery/item-detail-content";
import { getGalleryItem } from "@/server/gallery/gallery.service";

export const dynamic = "force-dynamic";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const item = await getGalleryItem(slug);
  if (!item) notFound();

  return (
    <main className="mx-auto w-full max-w-[56rem] px-4 py-8 sm:px-8 sm:py-12">
      <ItemDetailContent item={item} />
    </main>
  );
}
