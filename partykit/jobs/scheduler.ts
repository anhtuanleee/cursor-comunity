import { syncCreativeSources } from "../ingestion/creative-feed/sync";
import { syncRecentItems } from "../ingestion/recent/sync";
import { logWorkerError } from "../shared/logger";

const RECENT_SYNC_INTERVAL_MINUTES = 15;
const CREATIVE_SYNC_OFFSET_MINUTES = 5;

export async function runScheduledSync(
  scheduledTime: number,
  env: Env,
): Promise<void> {
  try {
    const minute = new Date(scheduledTime).getUTCMinutes();
    const slot = minute % RECENT_SYNC_INTERVAL_MINUTES;

    // One connector per cron invocation keeps CPU usage predictable.
    if (slot === 0) {
      await syncRecentItems(env);
    } else if (slot === CREATIVE_SYNC_OFFSET_MINUTES) {
      await syncCreativeSources(env);
    }
  } catch (error) {
    logWorkerError("scheduled_sync_failed", error, { scheduledTime });
    throw error;
  }
}
