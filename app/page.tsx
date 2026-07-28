import { getGalleryPage } from "@/server/gallery/gallery.service";
import { HomeClient } from "@/components/home/home-client";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialPage = await getGalleryPage();
  return <HomeClient initialPage={initialPage} />;
}
