-- Signal Room - PostgreSQL Schema (Neon DB)

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

CREATE TABLE IF NOT EXISTS reactions (
  item_id     TEXT NOT NULL CONSTRAINT reactions_item_fk REFERENCES items(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  user_name   TEXT NOT NULL,
  user_color  TEXT NOT NULL,
  kind        TEXT NOT NULL,
  created_at  BIGINT NOT NULL,
  PRIMARY KEY (item_id, user_id, kind),
  CONSTRAINT reactions_kind CHECK (kind IN ('love', 'useful', 'question'))
);

CREATE TABLE IF NOT EXISTS boards (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  created_at  BIGINT NOT NULL,
  updated_at  BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS board_items (
  board_id          TEXT NOT NULL CONSTRAINT board_items_board_fk REFERENCES boards(id) ON DELETE CASCADE,
  item_id           TEXT NOT NULL CONSTRAINT board_items_item_fk REFERENCES items(id) ON DELETE CASCADE,
  lane              TEXT NOT NULL,
  reason            TEXT NOT NULL DEFAULT '',
  position          INTEGER NOT NULL DEFAULT 0,
  updated_by        TEXT NOT NULL,
  updated_by_name   TEXT NOT NULL,
  updated_by_color  TEXT NOT NULL,
  updated_at        BIGINT NOT NULL,
  PRIMARY KEY (board_id, item_id),
  CONSTRAINT board_items_lane CHECK (lane IN ('keep', 'maybe', 'reject'))
);

INSERT INTO boards (id, name, slug, created_at, updated_at)
VALUES (
  'community-shortlist',
  'Community shortlist',
  'community-shortlist',
  (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS sync_state (
  id          INTEGER PRIMARY KEY DEFAULT 1,
  last_cursor TEXT,
  last_sync   BIGINT,
  total_items INTEGER DEFAULT 0
);

INSERT INTO sync_state (id, last_cursor) VALUES (1, NULL)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS content_sources (
  id           TEXT PRIMARY KEY,
  kind         TEXT NOT NULL,
  url          TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  enabled      BOOLEAN NOT NULL DEFAULT TRUE,
  rights_mode  TEXT NOT NULL DEFAULT 'link-only',
  trust_level  TEXT NOT NULL DEFAULT 'moderated',
  config_json  JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at   BIGINT NOT NULL,
  updated_at   BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS crawl_checkpoints (
  source_id        TEXT PRIMARY KEY CONSTRAINT crawl_checkpoints_source_fk REFERENCES content_sources(id) ON DELETE CASCADE,
  cursor_value     TEXT,
  etag             TEXT,
  last_modified    TEXT,
  last_success_at  BIGINT,
  last_error       TEXT,
  updated_at       BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS crawl_runs (
  id             TEXT PRIMARY KEY,
  source_id      TEXT NOT NULL CONSTRAINT crawl_runs_source_fk REFERENCES content_sources(id) ON DELETE CASCADE,
  status         TEXT NOT NULL,
  fetched_count  INTEGER NOT NULL DEFAULT 0,
  imported_count INTEGER NOT NULL DEFAULT 0,
  error          TEXT,
  started_at     BIGINT NOT NULL,
  finished_at    BIGINT
);

CREATE TABLE IF NOT EXISTS raw_items (
  source_id           TEXT NOT NULL CONSTRAINT raw_items_source_fk REFERENCES content_sources(id) ON DELETE CASCADE,
  external_id         TEXT NOT NULL,
  canonical_url       TEXT NOT NULL,
  payload_json        JSONB NOT NULL,
  payload_checksum    TEXT NOT NULL,
  source_published_at BIGINT,
  fetched_at          BIGINT NOT NULL,
  PRIMARY KEY (source_id, external_id)
);

CREATE TABLE IF NOT EXISTS moderation_decisions (
  id          TEXT PRIMARY KEY,
  source_id   TEXT NOT NULL CONSTRAINT moderation_decisions_source_fk REFERENCES content_sources(id) ON DELETE CASCADE,
  external_id TEXT NOT NULL,
  decision    TEXT NOT NULL,
  reason      TEXT NOT NULL DEFAULT '',
  decided_by  TEXT NOT NULL,
  decided_at  BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_items_published_at ON items(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category_id);
CREATE INDEX IF NOT EXISTS idx_items_slug ON items(slug);
CREATE INDEX IF NOT EXISTS idx_comments_item ON comments(item_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_created ON comments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_item_kind ON reactions(item_id, kind);
CREATE INDEX IF NOT EXISTS idx_board_items_board_lane_position
  ON board_items(board_id, lane, position, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_crawl_runs_source_started
  ON crawl_runs(source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_items_canonical_url ON raw_items(canonical_url);
CREATE INDEX IF NOT EXISTS idx_moderation_source_external
  ON moderation_decisions(source_id, external_id, decided_at DESC);
