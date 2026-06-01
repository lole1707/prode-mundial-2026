import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export async function POST(req: NextRequest) {
  const { uid, newPassword, adminUid } = await req.json();

  if (adminUid !== process.env.NEXT_PUBLIC_ADMIN_UID) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  if (!uid || !newPassword) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }
  if (newPassword.length < 4) {
    return NextResponse.json({ error: "Mínimo 4 caracteres" }, { status: 400 });
  }

  const res = await fetch(`${DB_URL}/auth/v1/admin/users/${uid}`, {
    method: "PUT",
    headers: {
      "apikey": SERVICE_KEY,
      "Authorization": `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password: newPassword }),
  });

  if (!res.ok) return NextResponse.json({ error: await res.text() }, { status: res.status });
  return NextResponse.json({ ok: true });
}
