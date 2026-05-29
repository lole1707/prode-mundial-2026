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
  const { uid, nombre, apellido, apodo, edad, altura, sector, photo } = await req.json();
  if (!uid || !nombre || !apellido || !apodo || !edad || !sector) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }
  const profileData = { nombre, apellido, apodo, edad, altura: altura ?? "", sector, ...(photo ? { photo } : {}) };
  const display_name = JSON.stringify(profileData);

  // PATCH returns the updated rows; empty array means no row with this uid exists
  const patch = await fetch(`${DB_URL}/rest/v1/users?uid=eq.${uid}`, {
    method: "PATCH",
    headers: h({ "Prefer": "return=representation" }),
    body: JSON.stringify({ display_name }),
  });

  if (!patch.ok) return NextResponse.json({ error: await patch.text() }, { status: patch.status });

  const updated: unknown[] = await patch.json().catch(() => []);

  if (updated.length === 0) {
    // Row doesn't exist — insert it (handles case where create-user's DB insert failed)
    const ins = await fetch(`${DB_URL}/rest/v1/users`, {
      method: "POST",
      headers: h({ "Prefer": "return=minimal" }),
      body: JSON.stringify({ uid, display_name, total_points: 0 }),
    });
    if (!ins.ok) return NextResponse.json({ error: await ins.text() }, { status: ins.status });
  }

  return NextResponse.json({ ok: true });
}
