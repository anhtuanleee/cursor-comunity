export const RECENT_INGEST_CRON = "2,17,32,47 * * * *";
export const CREATIVE_INGEST_CRON = "7,37 * * * *";

type IngestSource = "recent" | "creative";

export function sourceForCron(cron: string): IngestSource | null {
  if (cron === RECENT_INGEST_CRON) return "recent";
  if (cron === CREATIVE_INGEST_CRON) return "creative";
  return null;
}

/**
 * Workers Free only allows 10ms of CPU per Cron invocation. The actual feed
 * parsing and database writes therefore run in the Node endpoint; the Worker
 * is intentionally only a lightweight, reliable scheduler.
 */
export async function runScheduledSync(
  cron: string,
  env: Pick<Env, "INGEST_URL" | "INGEST_CRON_SECRET">,
): Promise<void> {
  const source = sourceForCron(cron);
  if (!source) return;

  try {
    if (!env.INGEST_URL || !env.INGEST_CRON_SECRET) {
      console.error(JSON.stringify({
        event: "scheduled_ingest_not_configured",
        source,
      }));
      return;
    }

    const target = new URL(env.INGEST_URL);
    if (target.protocol !== "https:") {
      throw new Error("INGEST_URL must use HTTPS");
    }
    target.pathname = "/api/internal/ingest";
    target.search = new URLSearchParams({ source }).toString();

    const response = await fetch(target, {
      headers: {
        Authorization: `Bearer ${env.INGEST_CRON_SECRET}`,
      },
    });
    const detail = (await response.text()).slice(0, 2_000);
    if (!response.ok) {
      console.error(JSON.stringify({
        event: "scheduled_ingest_failed",
        source,
        status: response.status,
        detail,
      }));
      return;
    }
    console.log(JSON.stringify({
      event: "scheduled_ingest_succeeded",
      source,
      detail,
    }));
  } catch (error) {
    console.error(JSON.stringify({
      event: "scheduled_ingest_failed",
      source,
      error: error instanceof Error ? error.message : String(error),
    }));
  }
}
