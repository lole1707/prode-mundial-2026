import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Called by Vercel Cron with Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = req.nextUrl.origin;
  const syncRes = await fetch(`${origin}/api/admin/sync-fixture`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminUid: process.env.NEXT_PUBLIC_ADMIN_UID }),
  });

  const data = await syncRes.json();
  return NextResponse.json({
    ok: syncRes.ok,
    timestamp: new Date().toISOString(),
    ...data,
  });
}
