import { NextResponse } from "next/server";
import { listCategories } from "@/server/categories/categories.repository";
import { logRouteError } from "@/server/http/responses";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ categories: await listCategories() });
  } catch (error) {
    logRouteError("categories.list", error);
    return NextResponse.json(
      { categories: [], error: "Unable to load categories" },
      { status: 500 },
    );
  }
}
