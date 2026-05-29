import { NextRequest, NextResponse } from "next/server";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function headers(extra?: Record<string, string>) {
  return {
    "apikey": SERVICE_KEY,
    "Authorization": `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json([], { status: 200 });

  const res = await fetch(`${DB_URL}/rest/v1/predictions?user_id=eq.${userId}`, {
    headers: headers(),
    cache: "no-store",
  });
  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(
    `${DB_URL}/rest/v1/predictions?on_conflict=user_id,match_id`,
    {
      method: "POST",
      headers: headers({ "Prefer": "resolution=merge-duplicates,return=representation" }),
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }
  return NextResponse.json(await res.json());
}
