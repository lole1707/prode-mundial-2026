import { NextRequest, NextResponse } from "next/server";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function h() {
  return { "apikey": SERVICE_KEY, "Authorization": `Bearer ${SERVICE_KEY}` };
}

function getGrupos(displayName: string): string[] {
  try {
    const p = JSON.parse(displayName);
    if (Array.isArray(p.grupos) && p.grupos.length > 0) return p.grupos;
    if (p.grupo) return [p.grupo];
  } catch {}
  return [];
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) return NextResponse.json({ members: [], predictions: [] });

  const usersRes = await fetch(
    `${DB_URL}/rest/v1/users?uid=neq.__scoring_config__&uid=neq.__groups_config__&limit=500`,
    { headers: h(), next: { revalidate: 20, tags: ["users"] } }
  );
  if (!usersRes.ok) return NextResponse.json({ members: [], predictions: [] });

  const allUsers: { uid: string; display_name: string; total_points: number }[] = await usersRes.json();

  const me = allUsers.find(u => u.uid === userId);
  if (!me) return NextResponse.json({ members: [], predictions: [] });

  const myGrupos = getGrupos(me.display_name);
  if (myGrupos.length === 0) return NextResponse.json({ members: [], predictions: [] });

  // Users that share at least one group with me
  const members = allUsers.filter(u =>
    getGrupos(u.display_name).some(g => myGrupos.includes(g))
  );
  if (members.length === 0) return NextResponse.json({ members, predictions: [] });

  const uids = members.map(u => u.uid).join(",");
  const predsRes = await fetch(
    `${DB_URL}/rest/v1/predictions?user_id=in.(${uids})&select=user_id,match_id,home_score,away_score`,
    { headers: h(), next: { revalidate: 15 } }
  );
  const predictions = predsRes.ok ? await predsRes.json() : [];

  return NextResponse.json({ members, predictions });
}
