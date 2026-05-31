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
    const { displayName, username, password, adminUid, grupo } = await req.json();

    if (adminUid !== process.env.NEXT_PUBLIC_ADMIN_UID) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Sanitize: only allow letters, numbers, dots, dashes, underscores
    const sanitized = username.toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "") // remove accents
      .replace(/\s+/g, ".")                              // spaces → dots
      .replace(/[^a-z0-9._-]/g, "");                    // remove invalid chars

    if (!sanitized) throw new Error("El nombre de usuario no tiene caracteres válidos");

    const email = `${sanitized}@prode.app`;

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
    // Store grupo in the display_name JSON so it persists through profile edits
    const initialDisplay = grupo
      ? JSON.stringify({ grupo, _name: displayName })
      : displayName;

    const insertRes = await fetch(`${DB_URL}/rest/v1/users`, {
      method: "POST",
      headers: h({ "Prefer": "return=minimal" }),
      body: JSON.stringify({ uid, display_name: initialDisplay, total_points: 0 }),
    });

    if (!insertRes.ok) {
      const err = await insertRes.text();
      return NextResponse.json({ error: `Usuario auth creado pero error en DB: ${err}` }, { status: 500 });
    }

    return NextResponse.json({ uid, username: sanitized, displayName });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
