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

CREATE INDEX IF NOT EXISTS idx_crawl_runs_source_started
  ON crawl_runs(source_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_raw_items_canonical_url
  ON raw_items(canonical_url);

CREATE INDEX IF NOT EXISTS idx_moderation_source_external
  ON moderation_decisions(source_id, external_id, decided_at DESC);
