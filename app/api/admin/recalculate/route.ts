import { NextRequest, NextResponse } from "next/server";

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

interface Match { id: string; home_score: number; away_score: number; finished: boolean; }
interface Prediction { match_id: string; home_score: number; away_score: number; }
interface ScoringConfig { exact: number; winner: number; draw: number; goalDiff: number; }

function calcPoints(ph: number, pa: number, rh: number, ra: number, cfg: ScoringConfig): number {
  if (ph === rh && pa === ra) return cfg.exact;
  const predWinner = ph > pa ? 1 : ph < pa ? -1 : 0;
  const realWinner = rh > ra ? 1 : rh < ra ? -1 : 0;
  if (predWinner !== realWinner) return 0;
  if (predWinner === 0 && realWinner === 0) return cfg.draw;
  if ((ph - pa) === (rh - ra)) return cfg.goalDiff;
  return cfg.winner;
}

export async function POST(req: NextRequest) {
  const { adminUid, scoring } = await req.json();
  if (adminUid !== process.env.NEXT_PUBLIC_ADMIN_UID) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Fetch finished matches
  const matchRes = await fetch(
    `${DB_URL}/rest/v1/matches?finished=eq.true&select=id,home_score,away_score,finished`,
    { headers: h(), cache: "no-store" }
  );
  const finishedMatches: Match[] = matchRes.ok ? await matchRes.json() : [];

  // Fetch all users
  const usersRes = await fetch(
    `${DB_URL}/rest/v1/users?uid=neq.__scoring_config__&select=uid`,
    { headers: h(), cache: "no-store" }
  );
  const users: { uid: string }[] = usersRes.ok ? await usersRes.json() : [];

  let updated = 0;
  for (const u of users) {
    const predRes = await fetch(
      `${DB_URL}/rest/v1/predictions?user_id=eq.${u.uid}&select=match_id,home_score,away_score`,
      { headers: h(), cache: "no-store" }
    );
    const preds: Prediction[] = predRes.ok ? await predRes.json() : [];

    let total = 0;
    for (const p of preds) {
      const match = finishedMatches.find(m => m.id === p.match_id);
      if (match) total += calcPoints(p.home_score, p.away_score, match.home_score, match.away_score, scoring);
    }

    await fetch(`${DB_URL}/rest/v1/users?uid=eq.${u.uid}`, {
      method: "PATCH",
      headers: h({ "Prefer": "return=minimal" }),
      body: JSON.stringify({ total_points: total }),
    });
    updated++;
  }

  return NextResponse.json({ ok: true, updated, finishedMatches: finishedMatches.length });
}
