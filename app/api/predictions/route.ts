import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ADMIN_UID = process.env.NEXT_PUBLIC_ADMIN_UID!;

function h(extra?: Record<string, string>) {
  return {
    "apikey": SERVICE_KEY,
    "Authorization": `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
    ...extra,
  };
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json([], { status: 200 });
  const res = await fetch(`${DB_URL}/rest/v1/predictions?user_id=eq.${userId}`, {
    headers: h(), cache: "no-store",
  });
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
  return NextResponse.json(await res.json());
}

export async function DELETE(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const matchId = req.nextUrl.searchParams.get("matchId");
  if (!userId || !matchId) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

  const res = await fetch(
    `${DB_URL}/rest/v1/predictions?user_id=eq.${userId}&match_id=eq.${matchId}`,
    { method: "DELETE", headers: h({ "Prefer": "return=minimal" }) }
  );
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });

  // Recalculate points after deletion
  recalculateUser(userId).catch(() => {});
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const res = await fetch(`${DB_URL}/rest/v1/predictions?on_conflict=user_id,match_id`, {
    method: "POST",
    headers: h({ "Prefer": "resolution=merge-duplicates,return=representation" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
  const saved = await res.json();

  // If there are finished matches, recalculate this user's points immediately
  const userId = Array.isArray(body) ? body[0]?.user_id : body?.user_id;
  if (userId) {
    recalculateUser(userId).catch(() => {});
  }

  return NextResponse.json(saved);
}

async function recalculateUser(userId: string) {
  // Fetch scoring config
  const cfgRes = await fetch(
    `${DB_URL}/rest/v1/users?uid=eq.__scoring_config__&select=display_name`,
    { headers: h(), cache: "no-store" }
  );
  const cfgRows = cfgRes.ok ? await cfgRes.json() : [];
  const defaults = { exact: 4, winner: 3, draw: 3, goalDiff: 1 };
  let scoring = defaults;
  try { if (cfgRows[0]) scoring = { ...defaults, ...JSON.parse(cfgRows[0].display_name) }; } catch {}

  // Fetch finished matches
  const matchRes = await fetch(
    `${DB_URL}/rest/v1/matches?finished=eq.true&select=id,home_score,away_score`,
    { headers: h(), cache: "no-store" }
  );
  const finished: { id: string; home_score: number; away_score: number }[] =
    matchRes.ok ? await matchRes.json() : [];
  if (finished.length === 0) return;

  // Fetch user predictions
  const predRes = await fetch(
    `${DB_URL}/rest/v1/predictions?user_id=eq.${userId}&select=match_id,home_score,away_score`,
    { headers: h(), cache: "no-store" }
  );
  const preds: { match_id: string; home_score: number; away_score: number }[] =
    predRes.ok ? await predRes.json() : [];

  let total = 0;
  for (const p of preds) {
    const m = finished.find(f => f.id === p.match_id);
    if (!m) continue;
    total += calcPoints(p.home_score, p.away_score, m.home_score, m.away_score, scoring);
  }

  await fetch(`${DB_URL}/rest/v1/users?uid=eq.${userId}`, {
    method: "PATCH",
    headers: h({ "Prefer": "return=minimal" }),
    body: JSON.stringify({ total_points: total }),
  });
}

function calcPoints(
  ph: number, pa: number, rh: number, ra: number,
  cfg: { exact: number; winner: number; draw: number; goalDiff: number }
): number {
  if (ph === rh && pa === ra) return cfg.exact;
  const pw = ph > pa ? 1 : ph < pa ? -1 : 0;
  const rw = rh > ra ? 1 : rh < ra ? -1 : 0;
  if (pw !== rw) return 0;
  if (pw === 0) return cfg.draw;
  if ((ph - pa) === (rh - ra)) return cfg.goalDiff;
  return cfg.winner;
}
