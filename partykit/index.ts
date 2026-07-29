import { GalleryRoom } from "./realtime/gallery-room";

export { GalleryRoom };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return env.GALLERY_ROOM.getByName("gallery").fetch(request);
  },
} satisfies ExportedHandler<Env>;
