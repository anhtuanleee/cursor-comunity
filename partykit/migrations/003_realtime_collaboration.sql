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

CREATE INDEX IF NOT EXISTS idx_reactions_item_kind
  ON reactions(item_id, kind);

CREATE INDEX IF NOT EXISTS idx_board_items_board_lane_position
  ON board_items(board_id, lane, position, updated_at DESC);
