import { sql } from "@/server/database/client";

export interface CategorySummary {
  slug: string;
  name: string;
}

export async function listCategories(): Promise<CategorySummary[]> {
  const rows = await sql`
    SELECT DISTINCT slug, name
    FROM gallery_categories
    ORDER BY sort_order
  `;
  return rows.map(row => ({
    slug: String(row.slug),
    name: String(row.name),
  }));
}
