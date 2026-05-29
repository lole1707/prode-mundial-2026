import { NextRequest, NextResponse } from "next/server";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const STORAGE_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1`;

function storageHeaders(contentType?: string) {
  return {
    "apikey": SERVICE_KEY,
    "Authorization": `Bearer ${SERVICE_KEY}`,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

async function ensureBucket() {
  await fetch(`${STORAGE_URL}/bucket`, {
    method: "POST",
    headers: { ...storageHeaders("application/json") },
    body: JSON.stringify({ id: "avatars", name: "avatars", public: true }),
  });
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const uid = formData.get("uid") as string | null;
  if (!file || !uid) return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

  await ensureBucket();

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const bytes = await file.arrayBuffer();

  const uploadRes = await fetch(`${STORAGE_URL}/object/avatars/${uid}/avatar.${ext}`, {
    method: "POST",
    headers: {
      ...storageHeaders(file.type || "image/jpeg"),
      "x-upsert": "true",
    },
    body: bytes,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    return NextResponse.json({ error: err }, { status: uploadRes.status });
  }

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${uid}/avatar.${ext}`;
  return NextResponse.json({ url });
}
