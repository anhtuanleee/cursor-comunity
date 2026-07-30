import { getGalleryPage } from "@/server/gallery/gallery.service";
import { listCategories } from "@/server/categories/categories.repository";
import { HomeClient } from "@/components/home/home-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [initialPage, categories] = await Promise.all([
    getGalleryPage(),
    listCategories(),
  ]);
  const filters = [
    { slug: null, label: "All" },
    ...categories.map(category => ({
      slug: category.slug,
      label: category.name,
    })),
  ];
  return <HomeClient initialPage={initialPage} filters={filters} />;
}
