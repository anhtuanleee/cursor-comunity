-- This database may already contain a Payload CMS `categories` table with an
-- integer ID. Keep the gallery namespace isolated to avoid cross-app changes.

CREATE TABLE IF NOT EXISTS gallery_categories (
  id         TEXT PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  scope      TEXT,
  sort_order INTEGER DEFAULT 0
);
