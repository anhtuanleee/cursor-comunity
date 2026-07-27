-- Cursor Community - PostgreSQL Schema (Neon DB)

CREATE TABLE IF NOT EXISTS gallery_categories (
  id         TEXT PRIMARY KEY,
  slug       TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  scope      TEXT,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS creators (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  handle     TEXT,
  url        TEXT,
  website    TEXT,
  avatar_url TEXT,
  created_at BIGINT,
  updated_at BIGINT
);

CREATE TABLE IF NOT EXISTS tags (
  id         TEXT PRIMARY KEY,
  context    TEXT,
  slug       TEXT NOT NULL,
  name       TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS items (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  description   TEXT,
  tagline       TEXT,
  format        TEXT DEFAULT 'tweet',
  category_id   TEXT CONSTRAINT items_category_fk REFERENCES gallery_categories(id) ON DELETE SET NULL,
  creator_id    TEXT CONSTRAINT items_creator_fk REFERENCES creators(id) ON DELETE SET NULL,
  source_url    TEXT,
  source_type   TEXT,
  cover_url     TEXT NOT NULL,
  gallery_json  JSONB,
  tags_json     JSONB,
  stats_json    JSONB,
  rating        REAL,
  rating_count  INTEGER,
  tool          TEXT,
  github_url    TEXT,
  github_stars  INTEGER,
  pricing       TEXT,
  pricing_label TEXT,
  status        TEXT DEFAULT 'published',
  staff_pick_at BIGINT,
  published_at  BIGINT NOT NULL,
  created_at    BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at    BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE TABLE IF NOT EXISTS item_tags (
  item_id TEXT CONSTRAINT item_tags_item_fk REFERENCES items(id) ON DELETE CASCADE,
  tag_id  TEXT CONSTRAINT item_tags_tag_fk REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id          TEXT PRIMARY KEY,
  item_id     TEXT NOT NULL CONSTRAINT comments_item_fk REFERENCES items(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  user_name   TEXT NOT NULL,
  user_color  TEXT NOT NULL,
  text        TEXT NOT NULL,
  parent_id   TEXT CONSTRAINT comments_parent_fk REFERENCES comments(id) ON DELETE CASCADE,
  position_x  REAL,
  position_y  REAL,
  resolved    BOOLEAN DEFAULT FALSE,
  created_at  BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  CONSTRAINT comments_text_length CHECK (char_length(text) BETWEEN 1 AND 2000)
);

CREATE TABLE IF NOT EXISTS sync_state (
  id          INTEGER PRIMARY KEY DEFAULT 1,
  last_cursor TEXT,
  last_sync   BIGINT,
  total_items INTEGER DEFAULT 0
);

INSERT INTO sync_state (id, last_cursor) VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_items_published_at ON items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_slug ON items(slug);
CREATE INDEX IF NOT EXISTS idx_comments_item ON comments(item_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_created ON comments(user_id, created_at DESC);
