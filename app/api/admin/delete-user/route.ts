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

export async function POST(req: NextRequest) {
  const { uid, adminUid } = await req.json();
  if (adminUid !== process.env.NEXT_PUBLIC_ADMIN_UID) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (!uid) return NextResponse.json({ error: "Falta uid" }, { status: 400 });

  // Delete auth user
  const authDel = await fetch(`${DB_URL}/auth/v1/admin/users/${uid}`, {
    method: "DELETE",
    headers: h(),
  });
  if (!authDel.ok && authDel.status !== 404) {
    return NextResponse.json({ error: await authDel.text() }, { status: authDel.status });
  }

  // Delete DB row
  await fetch(`${DB_URL}/rest/v1/users?uid=eq.${uid}`, {
    method: "DELETE",
    headers: h(),
  });

  return NextResponse.json({ ok: true });
}
