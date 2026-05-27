import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { displayName, username, password, adminUid } = await req.json();

    if (adminUid !== process.env.NEXT_PUBLIC_ADMIN_UID) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const email = `${username.toLowerCase()}@prode.app`;

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) throw new Error(error.message);

    await supabaseAdmin.from("users").insert({
      uid: data.user.id,
      display_name: displayName,
      total_points: 0,
    });

    return NextResponse.json({ uid: data.user.id, username, displayName });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
