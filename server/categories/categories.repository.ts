import { sql } from "@/server/database/client";

export interface CategorySummary {
  slug: string;
  name: string;
}

export async function listCategories(): Promise<CategorySummary[]> {
  const rows = await sql`
    SELECT category.slug, category.name
    FROM gallery_categories AS category
    WHERE EXISTS (
      SELECT 1
      FROM items
      WHERE items.category_id = category.id
        AND items.status = 'published'
    )
    ORDER BY category.sort_order, category.name
  `;
  return rows.map(row => ({
    slug: String(row.slug),
    name: String(row.name),
  }));
}
