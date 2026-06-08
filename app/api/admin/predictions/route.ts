import { NextResponse } from "next/server";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export async function GET() {
  const res = await fetch(
    `${DB_URL}/rest/v1/predictions?select=user_id,match_id,home_score,away_score`,
    {
      headers: {
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
      },
      next: { revalidate: 20 },
    }
  );
  if (!res.ok) return NextResponse.json([], { status: res.status });
  const data = await res.json();
  return NextResponse.json(data ?? []);
}
