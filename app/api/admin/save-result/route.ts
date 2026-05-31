import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function h(extra?: Record<string, string>) {
  return {
    "apikey": SERVICE_KEY,
    "Authorization": `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
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
  if (ph - pa === rh - ra) return cfg.goalDiff;
  return cfg.winner;
}

async function recalculateAll() {
  // Load scoring config
  const defaults = { exact: 4, winner: 3, draw: 3, goalDiff: 1 };
  let scoring = defaults;
  const cfgRes = await fetch(
    `${DB_URL}/rest/v1/users?uid=eq.__scoring_config__&select=display_name`,
    { headers: h(), cache: "no-store" }
  );
  if (cfgRes.ok) {
    const rows: { display_name: string }[] = await cfgRes.json();
    try { if (rows[0]) scoring = { ...defaults, ...JSON.parse(rows[0].display_name) }; } catch {}
  }

  // All finished matches
  const matchRes = await fetch(
    `${DB_URL}/rest/v1/matches?finished=eq.true&select=id,home_score,away_score`,
    { headers: h(), cache: "no-store" }
  );
  const finished: { id: string; home_score: number; away_score: number }[] =
    matchRes.ok ? await matchRes.json() : [];

  if (finished.length === 0) return;

  // All users
  const usersRes = await fetch(
    `${DB_URL}/rest/v1/users?uid=neq.__scoring_config__&select=uid`,
    { headers: h(), cache: "no-store" }
  );
  const users: { uid: string }[] = usersRes.ok ? await usersRes.json() : [];

  // Calculate and update each user
  await Promise.all(users.map(async (u) => {
    const predRes = await fetch(
      `${DB_URL}/rest/v1/predictions?user_id=eq.${u.uid}&select=match_id,home_score,away_score`,
      { headers: h(), cache: "no-store" }
    );
    const preds: { match_id: string; home_score: number; away_score: number }[] =
      predRes.ok ? await predRes.json() : [];

    let total = 0;
    for (const p of preds) {
      const m = finished.find(f => f.id === p.match_id);
      if (m) total += calcPoints(p.home_score, p.away_score, m.home_score, m.away_score, scoring);
    }

    await fetch(`${DB_URL}/rest/v1/users?uid=eq.${u.uid}`, {
      method: "PATCH",
      headers: h({ "Prefer": "return=minimal" }),
      body: JSON.stringify({ total_points: total }),
    });
  }));
}

export async function POST(req: NextRequest) {
  const { adminUid, matches } = await req.json();
  if (adminUid !== process.env.NEXT_PUBLIC_ADMIN_UID) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Save each result
  for (const m of matches as { id: string; home: number; away: number; finished: boolean }[]) {
    const res = await fetch(`${DB_URL}/rest/v1/matches?id=eq.${m.id}`, {
      method: "PATCH",
      headers: h({ "Prefer": "return=minimal" }),
      body: JSON.stringify({ home_score: m.home ?? null, away_score: m.away ?? null, finished: m.finished }),
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Error guardando partido ${m.id}: ${await res.text()}` }, { status: res.status });
    }
  }

  // Recalculate ALL users automatically — no button needed
  await recalculateAll();

  return NextResponse.json({ ok: true });
}
