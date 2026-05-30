import { NextResponse } from "next/server";

const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const DB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const STORAGE_URL = `${DB_URL}/storage/v1`;

function h(extra?: Record<string, string>) {
  return {
    "apikey": SERVICE_KEY,
    "Authorization": `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function countRows(table: string): Promise<number> {
  const res = await fetch(`${DB_URL}/rest/v1/${table}?select=count`, {
    headers: { ...h(), "Prefer": "count=exact" },
    cache: "no-store",
  });
  const range = res.headers.get("content-range") ?? "";
  const match = range.match(/\/(\d+)$/);
  return match ? parseInt(match[1]) : 0;
}

async function storageStats(): Promise<{ count: number; sizeBytes: number; files: { name: string; size: number }[] }> {
  const res = await fetch(`${STORAGE_URL}/object/list/avatars`, {
    method: "POST",
    headers: h(),
    body: JSON.stringify({ prefix: "", limit: 10000, offset: 0, sortBy: { column: "created_at", order: "desc" } }),
    cache: "no-store",
  });
  if (!res.ok) return { count: 0, sizeBytes: 0, files: [] };
  const items: { name: string; metadata?: { size?: number; mimetype?: string } }[] = await res.json();
  const files = (items ?? [])
    .filter(f => f.name && f.name !== ".emptyFolderPlaceholder")
    .map(f => ({ name: f.name, size: f.metadata?.size ?? 0 }));
  return {
    count: files.length,
    sizeBytes: files.reduce((s, f) => s + f.size, 0),
    files,
  };
}

export async function GET() {
  const [users, matches, predictions, storage] = await Promise.all([
    countRows("users"),
    countRows("matches"),
    countRows("predictions"),
    storageStats(),
  ]);

  return NextResponse.json({
    tables: { users, matches, predictions },
    storage,
    supabaseProject: DB_URL,
    timestamp: new Date().toISOString(),
  });
}
