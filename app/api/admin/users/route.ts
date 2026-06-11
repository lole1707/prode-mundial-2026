import { NextResponse } from "next/server";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

function h() {
  return {
    "apikey": SERVICE_KEY,
    "Authorization": `Bearer ${SERVICE_KEY}`,
  };
}

export async function GET() {
  const [dbRes, authRes] = await Promise.all([
    fetch(
      `${DB_URL}/rest/v1/users?uid=neq.__scoring_config__&uid=neq.__groups_config__&order=total_points.desc&limit=500`,
      { headers: h(), next: { revalidate: 20, tags: ["users"] } }
    ),
    fetch(`${DB_URL}/auth/v1/admin/users?per_page=1000`, {
      headers: h(),
      next: { revalidate: 20 },
    }),
  ]);

  if (!dbRes.ok) return NextResponse.json([], { status: dbRes.status });
  const data: { uid: string; display_name: string; total_points: number }[] = await dbRes.json() ?? [];

  // Build uid → username map from auth users
  const emailMap: Record<string, string> = {};
  if (authRes.ok) {
    const authData = await authRes.json();
    const authUsers: { id: string; email?: string }[] = authData.users ?? authData ?? [];
    for (const u of authUsers) {
      if (u.email?.endsWith("@prode.app")) {
        emailMap[u.id] = u.email.replace("@prode.app", "");
      }
    }
  }

  return NextResponse.json(data.map(u => ({ ...u, username: emailMap[u.uid] ?? null })));
}
