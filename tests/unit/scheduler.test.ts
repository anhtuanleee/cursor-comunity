import {
  CREATIVE_INGEST_CRON,
  RECENT_INGEST_CRON,
  sourceForCron,
} from "@/partykit/jobs/scheduler";

describe("Cloudflare ingest schedule", () => {
  it("maps each configured Cron expression to exactly one source", () => {
    expect(sourceForCron(RECENT_INGEST_CRON)).toBe("recent");
    expect(sourceForCron(CREATIVE_INGEST_CRON)).toBe("creative");
  });

  it("does not run an unknown Cron expression", () => {
    expect(sourceForCron("*/5 * * * *")).toBeNull();
  });
});
