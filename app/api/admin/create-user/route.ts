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
  try {
    const { displayName, username, password, adminUid } = await req.json();

    if (adminUid !== process.env.NEXT_PUBLIC_ADMIN_UID) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const email = `${username.toLowerCase()}@prode.app`;

    // Create auth user via Admin REST API
    const authRes = await fetch(`${DB_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: h(),
      body: JSON.stringify({ email, password, email_confirm: true }),
    });

    if (!authRes.ok) {
      const err = await authRes.json().catch(() => ({}));
      throw new Error(err.msg || err.message || `Auth error ${authRes.status}`);
    }

    const authData = await authRes.json();
    const uid = authData.id;
    if (!uid) throw new Error("No se recibió ID de usuario");

    // Insert into users table via raw fetch (supabase JS client silently fails with sb_secret_ keys)
    const insertRes = await fetch(`${DB_URL}/rest/v1/users`, {
      method: "POST",
      headers: h({ "Prefer": "return=minimal" }),
      body: JSON.stringify({ uid, display_name: displayName, total_points: 0 }),
    });

    if (!insertRes.ok) {
      const err = await insertRes.text();
      console.error("users insert error:", err);
    }

    return NextResponse.json({ uid, username, displayName });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
