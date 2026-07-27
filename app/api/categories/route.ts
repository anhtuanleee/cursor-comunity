import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await sql`SELECT DISTINCT slug, name FROM gallery_categories ORDER BY sort_order`;
    return NextResponse.json({ categories: rows || [] });
  } catch (error) {
    console.error("[categories] GET failed", error);
    return NextResponse.json({ categories: [], error: "Unable to load categories" }, { status: 500 });
  }
}
