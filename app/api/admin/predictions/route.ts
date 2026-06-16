import { NextResponse } from "next/server";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const PAGE = 5000;

export async function GET() {
  const all: unknown[] = [];
  let offset = 0;

  while (true) {
    const res = await fetch(
      `${DB_URL}/rest/v1/predictions?select=user_id,match_id,home_score,away_score&limit=${PAGE}&offset=${offset}`,
      {
        headers: {
          "apikey": SERVICE_KEY,
          "Authorization": `Bearer ${SERVICE_KEY}`,
          "Range-Unit": "items",
        },
        cache: "no-store",
      }
    );
    if (!res.ok) break;
    const page: unknown[] = await res.json();
    all.push(...page);
    if (page.length < PAGE) break;
    offset += PAGE;
  }

  return NextResponse.json(all);
}
