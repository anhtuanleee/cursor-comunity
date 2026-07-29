import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import process from "node:process";
import postgres from "postgres";

const UUID_V5 = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const namespace = Buffer.from("bf4c5d7e9cd84b7ca05edda8fd3e0b15", "hex");

function loadEnvironment(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || process.env[match[1]]) continue;
    const value = match[2].replace(/^(?:"|')|(?:"|')$/g, "");
    process.env[match[1]] = value;
  }
}

loadEnvironment(resolve(".env"));
loadEnvironment(resolve(".env.local"));

function publicSlug(value) {
  const bytes = createHash("sha1")
    .update(namespace)
    .update(value)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to normalize public item slugs.");
}

const sql = postgres(databaseUrl, { ssl: "require", max: 1, prepare: false });

try {
  const rows = await sql`
    SELECT id, source_url, slug
    FROM items
    ORDER BY id
  `;
  const desired = new Map();

  for (const row of rows) {
    const id = String(row.id);
    const source = String(row.source_url || `item:${id}`);
    let slug = publicSlug(source);
    let collision = 0;
    while (desired.has(slug)) {
      collision += 1;
      slug = publicSlug(`item:${id}:${collision}`);
    }
    desired.set(slug, id);
  }

  const outdated = rows.filter((row) => !UUID_V5.test(String(row.slug)));
  console.log(`Checked ${rows.length} item(s); ${outdated.length} require normalization.`);
  if (outdated.length === 0) {
    console.log("Public item slugs already use UUIDv5.");
  } else {
    const replacements = [...desired].map(([slug, id]) => ({ id, slug }));
    const now = Date.now();
    const applyReplacements = (transaction) => transaction`
      WITH replacements AS (
        SELECT id, slug
        FROM jsonb_to_recordset(${transaction.json(replacements)}) AS value(id text, slug text)
      )
      UPDATE items AS item
      SET slug = replacements.slug, updated_at = ${now}
      FROM replacements
      WHERE item.id = replacements.id
    `;

    // A direct bulk update is safe when every current slug is non-UUID, which
    // is the normal legacy state. The two-phase path only protects a partially
    // migrated database from a transient unique-index collision.
    if (rows.every((row) => !UUID_V5.test(String(row.slug)))) {
      await applyReplacements(sql);
    } else {
      await sql.begin(async (transaction) => {
        await transaction`
          UPDATE items
          SET slug = CONCAT('migrating-', id)
        `;
        await applyReplacements(transaction);
      });
    }
    console.log(`Normalized ${outdated.length} public item slug(s) to UUIDv5.`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
