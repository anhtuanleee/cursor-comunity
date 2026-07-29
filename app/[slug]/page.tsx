import { notFound } from "next/navigation";
import { ItemDetailContent } from "@/components/gallery/item-detail-content";
import {
  getGalleryItem,
  getPublishedItemSlugs,
} from "@/server/gallery/gallery.service";

// Pre-render the most recent references at build time. New references remain
// available on demand and the page output is refreshed through ISR.
export const revalidate = 300;
export const dynamicParams = true;

export async function generateStaticParams() {
  const slugs = await getPublishedItemSlugs();
  return slugs.map(slug => ({ slug }));
}

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
