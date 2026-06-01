"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { getDisplayName, getPhoto, getGrupo } from "@/lib/profile";

interface LeaderboardUser { uid: string; display_name: string; total_points: number; }

function Avatar({ photo, name, size }: { photo?: string; name: string; size: "lg" | "sm" }) {
  const cls = size === "lg"
    ? "w-20 h-20 rounded-full object-cover border-4 border-yellow-400 shadow-lg flex-shrink-0"
    : "w-10 h-10 rounded-full object-cover border-2 border-gray-700 flex-shrink-0";
  const fallbackCls = size === "lg"
    ? "w-20 h-20 rounded-full bg-gray-700 border-4 border-yellow-400 flex items-center justify-center text-2xl font-bold text-gray-300 flex-shrink-0"
    : "w-10 h-10 rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center text-sm font-bold text-gray-300 flex-shrink-0";
  return photo
    ? <img src={photo} alt={name} className={cls} />
    : <div className={fallbackCls}>{name[0]?.toUpperCase() ?? "?"}</div>;
}

function GrupoSection({ title, lista, currentUid }: { title: string; lista: LeaderboardUser[]; currentUid?: string }) {
  if (lista.length === 0) return null;
  const [first, ...rest] = lista;
  const firstName = getDisplayName(first.display_name);
  const firstPhoto = getPhoto(first.display_name);

  return (
    <div className="mb-10">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-green-400">▸</span> {title}
        <span className="text-xs text-gray-500 font-normal">({lista.length} participante{lista.length !== 1 ? "s" : ""})</span>
      </h2>

      {/* 1st place */}
      <div className={`flex flex-col items-center bg-gray-900 border-2 rounded-2xl px-6 py-6 mb-3 ${first.uid === currentUid ? "border-green-600" : "border-yellow-500/60"}`}>
        <span className="text-3xl mb-2">🥇</span>
        <Avatar photo={firstPhoto} name={firstName} size="lg" />
        <p className="mt-3 text-lg font-bold text-white">
          {firstName} {first.uid === currentUid && <span className="text-sm text-green-400">(vos)</span>}
        </p>
        <p className="text-3xl font-bold text-green-400 mt-1">{first.total_points}</p>
        <p className="text-xs text-gray-500">pts</p>
      </div>

      {/* Rest */}
      <div className="space-y-2">
        {rest.map((u, i) => {
          const name = getDisplayName(u.display_name);
          const photo = getPhoto(u.display_name);
          const pos = i + 2;
          const isMe = u.uid === currentUid;
          return (
            <div key={u.uid} className={`flex items-center gap-3 bg-gray-900 border rounded-xl px-4 py-3 ${isMe ? "border-green-700" : "border-gray-800"}`}>
              <span className="w-8 text-center flex-shrink-0">
                {pos === 2 ? <span className="text-lg">🥈</span>
                  : pos === 3 ? <span className="text-lg">🥉</span>
                  : <span className="text-gray-500 text-sm font-medium">#{pos}</span>}
              </span>
              <Avatar photo={photo} name={name} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {name} {isMe && <span className="text-xs text-green-400">(vos)</span>}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xl font-bold text-green-400">{u.total_points}</p>
                <p className="text-xs text-gray-500">pts</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Leaderboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/admin/users")
      .then(r => r.json())
      .then((data: LeaderboardUser[]) => {
        const sorted = (data ?? []).sort((a, b) =>
          b.total_points - a.total_points || getDisplayName(a.display_name).localeCompare(getDisplayName(b.display_name))
        );
        setUsers(sorted);
      })
      .finally(() => setFetching(false));
  }, [user]);

  if (loading || fetching) return (
    <div className="min-h-screen">
      <Navbar />
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-green-500" />
      </div>
    </div>
  );

  // Group users by their grupo
  const grupos = Array.from(new Set(users.map(u => getGrupo(u.display_name) ?? "Sin grupo"))).sort();

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Tabla de Posiciones</h1>

        {users.length === 0 ? (
          <p className="text-gray-400 text-center py-12">Aún no hay participantes.</p>
        ) : (
          <div className="grid grid-cols-2 gap-6 items-start">
            {grupos.map(g => (
              <GrupoSection
                key={g}
                title={g}
                lista={users.filter(u => (getGrupo(u.display_name) ?? "Sin grupo") === g)}
                currentUid={user?.uid}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
