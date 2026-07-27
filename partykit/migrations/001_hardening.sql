-- Adds constraints to an existing database without scanning legacy rows.
-- New writes are checked immediately. Run VALIDATE CONSTRAINT separately
-- after cleaning any legacy orphaned rows.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'items_category_fk') THEN
    ALTER TABLE items
      ADD CONSTRAINT items_category_fk
      FOREIGN KEY (category_id) REFERENCES gallery_categories(id)
      ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'items_creator_fk') THEN
    ALTER TABLE items
      ADD CONSTRAINT items_creator_fk
      FOREIGN KEY (creator_id) REFERENCES creators(id)
      ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'item_tags_item_fk') THEN
    ALTER TABLE item_tags
      ADD CONSTRAINT item_tags_item_fk
      FOREIGN KEY (item_id) REFERENCES items(id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'item_tags_tag_fk') THEN
    ALTER TABLE item_tags
      ADD CONSTRAINT item_tags_tag_fk
      FOREIGN KEY (tag_id) REFERENCES tags(id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_item_fk') THEN
    ALTER TABLE comments
      ADD CONSTRAINT comments_item_fk
      FOREIGN KEY (item_id) REFERENCES items(id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_parent_fk') THEN
    ALTER TABLE comments
      ADD CONSTRAINT comments_parent_fk
      FOREIGN KEY (parent_id) REFERENCES comments(id)
      ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'comments_text_length') THEN
    ALTER TABLE comments
      ADD CONSTRAINT comments_text_length
      CHECK (char_length(text) BETWEEN 1 AND 2000) NOT VALID;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_comments_user_created
  ON comments(user_id, created_at DESC);
