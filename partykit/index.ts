import { GalleryRoom } from "./realtime/gallery-room";
import { runScheduledSync } from "./jobs/scheduler";

export { GalleryRoom };

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    return env.GALLERY_ROOM.getByName("gallery").fetch(request);
  },

  scheduled(
    controller: ScheduledController,
    env: Env,
    context: ExecutionContext,
  ): void {
    context.waitUntil(runScheduledSync(controller.scheduledTime, env));
  },
} satisfies ExportedHandler<Env>;
