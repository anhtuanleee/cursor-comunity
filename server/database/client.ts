import "server-only";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured");
}

export const sql = postgres(databaseUrl, {
  ssl: "require",
  max: 10,
  idle_timeout: 20,
});
