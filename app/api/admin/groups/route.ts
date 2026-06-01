import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const GROUPS_UID = "__groups_config__";

function h(extra?: Record<string, string>) {
  return {
    "apikey": SERVICE_KEY,
    "Authorization": `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function loadGroups(): Promise<string[]> {
  const res = await fetch(`${DB_URL}/rest/v1/users?uid=eq.${GROUPS_UID}&select=display_name`, {
    headers: h(), cache: "no-store",
  });
  if (!res.ok) return [];
  const rows: { display_name: string }[] = await res.json();
  try { return JSON.parse(rows[0]?.display_name ?? "[]"); } catch { return []; }
}

async function saveGroups(groups: string[]): Promise<void> {
  const display_name = JSON.stringify(groups);
  const patch = await fetch(`${DB_URL}/rest/v1/users?uid=eq.${GROUPS_UID}`, {
    method: "PATCH",
    headers: h({ "Prefer": "return=representation" }),
    body: JSON.stringify({ display_name }),
  });
  const updated: unknown[] = patch.ok ? await patch.json().catch(() => []) : [];
  if (updated.length === 0) {
    await fetch(`${DB_URL}/rest/v1/users`, {
      method: "POST",
      headers: h({ "Prefer": "return=minimal" }),
      body: JSON.stringify({ uid: GROUPS_UID, display_name, total_points: 0 }),
    });
  }
}

export async function GET() {
  return NextResponse.json(await loadGroups());
}

export async function POST(req: NextRequest) {
  const { adminUid, name } = await req.json();
  if (adminUid !== process.env.NEXT_PUBLIC_ADMIN_UID) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  if (!name?.trim()) return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
  const groups = await loadGroups();
  if (groups.includes(name.trim())) return NextResponse.json({ error: "Ya existe" }, { status: 400 });
  groups.push(name.trim());
  await saveGroups(groups);
  return NextResponse.json({ groups });
}

export async function DELETE(req: NextRequest) {
  const { adminUid, name } = await req.json();
  if (adminUid !== process.env.NEXT_PUBLIC_ADMIN_UID) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  const groups = (await loadGroups()).filter(g => g !== name);
  await saveGroups(groups);
  return NextResponse.json({ groups });
}
