import { NextResponse } from "next/server";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function h() {
  return {
    "apikey": SERVICE_KEY,
    "Authorization": `Bearer ${SERVICE_KEY}`,
  };
}

export async function GET() {
  const res = await fetch(
    `${DB_URL}/rest/v1/users?uid=neq.__scoring_config__&order=total_points.desc`,
    { headers: h(), cache: "no-store" }
  );
  if (!res.ok) return NextResponse.json([], { status: res.status });
  const data = await res.json();
  return NextResponse.json(data ?? []);
}
