"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { getDisplayName, getPhoto } from "@/lib/profile";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

interface LeaderboardUser { uid: string; display_name: string; total_points: number; }

export default function Leaderboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    async function load() {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/users?uid=neq.__scoring_config__&select=uid,display_name,total_points&order=total_points.desc`,
        { headers: { "apikey": SUPABASE_KEY } }
      );
      const data: LeaderboardUser[] = res.ok ? await res.json() : [];
      setUsers(data);
      setFetching(false);
    }
    if (user) load();
  }, [user]);

  if (loading || fetching) return <div className="min-h-screen"><Navbar /><div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-green-500" /></div></div>;

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Tabla de Posiciones</h1>
        {users.length === 0 ? (
          <p className="text-gray-400 text-center py-12">Aún no hay participantes con puntos.</p>
        ) : (
          <div className="space-y-2">
            {users.map((u, i) => {
              const name = getDisplayName(u.display_name);
              const photo = getPhoto(u.display_name);
              return (
                <div key={u.uid} className={`flex items-center gap-4 bg-gray-900 border rounded-xl px-4 py-3 ${u.uid === user?.uid ? "border-green-700" : "border-gray-800"}`}>
                  <span className="w-8 text-center text-lg">{i < 3 ? medals[i] : <span className="text-gray-500 text-sm">#{i + 1}</span>}</span>
                  {photo ? (
                    <img src={photo} alt={name} className="w-9 h-9 rounded-full object-cover border border-gray-700 flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-300 flex-shrink-0">
                      {name[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{name} {u.uid === user?.uid && <span className="text-xs text-green-400">(vos)</span>}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold text-green-400">{u.total_points}</p>
                    <p className="text-xs text-gray-500">pts</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
