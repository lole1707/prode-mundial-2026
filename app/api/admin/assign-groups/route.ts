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

export async function POST(req: NextRequest) {
  const { adminUid, uid, grupos } = await req.json();
  if (adminUid !== process.env.NEXT_PUBLIC_ADMIN_UID) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  // Fetch current display_name
  const res = await fetch(`${DB_URL}/rest/v1/users?uid=eq.${uid}&select=display_name`, {
    headers: h(), cache: "no-store",
  });
  const rows: { display_name: string }[] = res.ok ? await res.json() : [];
  const raw = rows[0]?.display_name ?? "";

  let profile: Record<string, unknown> = {};
  try { profile = JSON.parse(raw); } catch { profile = { _name: raw }; }

  // Update grupos array
  profile.grupos = grupos;
  // Remove old singular grupo
  delete profile.grupo;

  const patch = await fetch(`${DB_URL}/rest/v1/users?uid=eq.${uid}`, {
    method: "PATCH",
    headers: h({ "Prefer": "return=minimal" }),
    body: JSON.stringify({ display_name: JSON.stringify(profile) }),
  });

  if (!patch.ok) return NextResponse.json({ error: await patch.text() }, { status: patch.status });
  return NextResponse.json({ ok: true });
}
