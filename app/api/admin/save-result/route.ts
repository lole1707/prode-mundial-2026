import { NextRequest, NextResponse } from "next/server";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function h() {
  return {
    "apikey": SERVICE_KEY,
    "Authorization": `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
  };
}

export async function POST(req: NextRequest) {
  const { adminUid, matches } = await req.json();
  if (adminUid !== process.env.NEXT_PUBLIC_ADMIN_UID) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  for (const m of matches as { id: string; home: number; away: number; finished: boolean }[]) {
    const res = await fetch(`${DB_URL}/rest/v1/matches?id=eq.${m.id}`, {
      method: "PATCH",
      headers: h(),
      body: JSON.stringify({ home_score: m.home, away_score: m.away, finished: m.finished }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Error al guardar partido ${m.id}: ${await res.text()}` }, { status: res.status });
    }
  }

  return NextResponse.json({ ok: true });
}
