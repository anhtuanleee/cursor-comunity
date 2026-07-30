import type postgres from "postgres";
import {
  CREATIVE_GALLERY_CATEGORIES,
  type CreativeGalleryCategory,
} from "./classification";

type Database = postgres.Sql;

export async function ensureCreativeGalleryCategory(
  sql: Database,
  category: CreativeGalleryCategory,
) {
  await sql`
    INSERT INTO gallery_categories(id, slug, name, scope, sort_order)
    VALUES(
      ${category.id}, ${category.slug}, ${category.name},
      'creative', ${category.sortOrder}
    )
    ON CONFLICT(id) DO UPDATE SET
      slug = EXCLUDED.slug,
      name = EXCLUDED.name,
      scope = EXCLUDED.scope,
      sort_order = EXCLUDED.sort_order
  `;
  return category.id;
}

export async function ensureCreativeGalleryCategories(sql: Database) {
  await Promise.all(
    Object.values(CREATIVE_GALLERY_CATEGORIES)
      .map(category => ensureCreativeGalleryCategory(sql, category)),
  );
}
