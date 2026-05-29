import { NextRequest, NextResponse } from "next/server";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const CONFIG_UID = "__scoring_config__";

export const DEFAULTS = { exact: 4, winner: 3, draw: 3, goalDiff: 1 };

function h(extra?: Record<string, string>) {
  return {
    "apikey": SERVICE_KEY,
    "Authorization": `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export async function GET() {
  const res = await fetch(
    `${DB_URL}/rest/v1/users?uid=eq.${CONFIG_UID}&select=display_name`,
    { headers: h(), cache: "no-store" }
  );
  if (res.ok) {
    const rows = await res.json() as { display_name: string }[];
    if (rows.length > 0) {
      try { return NextResponse.json(JSON.parse(rows[0].display_name)); } catch {}
    }
  }
  // First time: insert default config row
  await fetch(`${DB_URL}/rest/v1/users?on_conflict=uid`, {
    method: "POST",
    headers: h({ "Prefer": "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({ uid: CONFIG_UID, display_name: JSON.stringify(DEFAULTS), total_points: 0 }),
  });
  return NextResponse.json(DEFAULTS);
}

export async function POST(req: NextRequest) {
  const { adminUid, scoring } = await req.json();
  if (adminUid !== process.env.NEXT_PUBLIC_ADMIN_UID) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const res = await fetch(`${DB_URL}/rest/v1/users?on_conflict=uid`, {
    method: "POST",
    headers: h({ "Prefer": "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({ uid: CONFIG_UID, display_name: JSON.stringify(scoring), total_points: 0 }),
  });
  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
  return NextResponse.json({ ok: true });
}
