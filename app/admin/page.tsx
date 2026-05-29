"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Match } from "@/lib/types";
import { FIXTURE } from "@/lib/fixture";
import { calculatePoints, ScoringConfig } from "@/lib/scoring";
import { DEFAULTS } from "@/app/api/config/route";
import { getDisplayName, getPhoto } from "@/lib/profile";
import Navbar from "@/components/Navbar";
import FlagImg from "@/components/FlagImg";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

type Tab = "fixture" | "users" | "scoring";

interface DBUser { uid: string; display_name: string; total_points: number; }

function apiHeaders() {
  return { "apikey": SUPABASE_KEY, "Content-Type": "application/json" };
}

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("fixture");
  const [matches, setMatches] = useState<Match[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { home: string; away: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [recalculating, setRecalculating] = useState(false);
  const [activeStage, setActiveStage] = useState("group");
  const [users, setUsers] = useState<DBUser[]>([]);
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [scoring, setScoring] = useState<ScoringConfig>(DEFAULTS);
  const [scoringMsg, setScoringMsg] = useState("");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.push("/dashboard");
  }, [user, isAdmin, loading, router]);

  useEffect(() => {
    if (!isAdmin) return;

    fetch("/api/config").then(r => r.json()).then(cfg => setScoring(cfg)).catch(() => {});

    fetch("/api/matches")
      .then(r => r.json())
      .then((data: Record<string, unknown>[]) => {
        if (data?.length) {
          setMatches(data.map(m => ({
            id: m.id as string, homeTeam: m.home_team as string, awayTeam: m.away_team as string,
            homeFlag: m.home_flag as string, awayFlag: m.away_flag as string, stage: m.stage as Match["stage"],
            group: m.group_name as string, matchNumber: m.match_number as number, datetime: m.datetime as string,
            venue: m.venue as string, homeScore: m.home_score as number, awayScore: m.away_score as number, finished: m.finished as boolean,
          })));
        }
      });

    fetch(`${SUPABASE_URL}/rest/v1/users?uid=neq.__scoring_config__&order=total_points.desc`, { headers: apiHeaders() })
      .then(r => r.json())
      .then((data: DBUser[]) => setUsers(data ?? []));
  }, [isAdmin]);

  async function syncFromAPI() {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/admin/sync-fixture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminUid: user?.uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSyncMsg(`✓ ${data.synced} partidos sincronizados (${data.finished} finalizados)`);
      const matchRes = await fetch("/api/matches");
      if (matchRes.ok) {
        const matchData = await matchRes.json() as Record<string, unknown>[];
        setMatches(matchData.map(m => ({
          id: m.id as string, homeTeam: m.home_team as string, awayTeam: m.away_team as string,
          homeFlag: m.home_flag as string, awayFlag: m.away_flag as string, stage: m.stage as Match["stage"],
          group: m.group_name as string, matchNumber: m.match_number as number, datetime: m.datetime as string,
          venue: m.venue as string, homeScore: m.home_score as number, awayScore: m.away_score as number, finished: m.finished as boolean,
        })));
      }
    } catch (err: unknown) {
      setSyncMsg(`✗ ${err instanceof Error ? err.message : "Error"}`);
    } finally {
      setSyncing(false);
    }
  }

  async function seedFixture() {
    setSeeding(true);
    const rows = FIXTURE.map(m => ({
      id: m.id, home_team: m.homeTeam, away_team: m.awayTeam,
      home_flag: m.homeFlag, away_flag: m.awayFlag, stage: m.stage,
      group_name: m.group ?? null, match_number: m.matchNumber,
      datetime: m.datetime, venue: m.venue,
      home_score: null, away_score: null, finished: false,
    }));
    await fetch(`${SUPABASE_URL}/rest/v1/matches?on_conflict=id`, {
      method: "POST",
      headers: { ...apiHeaders(), "Prefer": "resolution=merge-duplicates" },
      body: JSON.stringify(rows),
    });
    setMatches(FIXTURE.map(m => ({ ...m, homeScore: null, awayScore: null, finished: false })));
    setSeeding(false);
  }

  async function saveResult(matchId: string) {
    const draft = drafts[matchId];
    if (!draft) return;
    const home = parseInt(draft.home), away = parseInt(draft.away);
    if (isNaN(home) || isNaN(away)) return;
    setSaving(matchId);
    await fetch(`${SUPABASE_URL}/rest/v1/matches?id=eq.${matchId}`, {
      method: "PATCH",
      headers: apiHeaders(),
      body: JSON.stringify({ home_score: home, away_score: away, finished: true }),
    });
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, homeScore: home, awayScore: away, finished: true } : m));
    setDrafts(prev => { const n = { ...prev }; delete n[matchId]; return n; });
    setSaving(null);
  }

  async function recalculateAll() {
    setRecalculating(true);
    const finished = matches.filter(m => m.finished && m.homeScore !== null);
    const usersRes = await fetch(`/api/predictions`);
    const allUsersRes = await fetch(`${SUPABASE_URL}/rest/v1/users?uid=neq.__scoring_config__&select=uid,display_name,total_points`, { headers: apiHeaders() });
    const allUsers: DBUser[] = allUsersRes.ok ? await allUsersRes.json() : [];
    for (const u of allUsers) {
      const predRes = await fetch(`/api/predictions?userId=${u.uid}`);
      const preds: Record<string, unknown>[] = predRes.ok ? await predRes.json() : [];
      let total = 0;
      for (const p of preds) {
        const match = finished.find(m => m.id === p.match_id);
        if (match) total += calculatePoints(p.home_score as number, p.away_score as number, match.homeScore!, match.awayScore!, scoring);
      }
      await fetch(`${SUPABASE_URL}/rest/v1/users?uid=eq.${u.uid}`, {
        method: "PATCH",
        headers: apiHeaders(),
        body: JSON.stringify({ total_points: total }),
      });
    }
    setRecalculating(false);
    alert("Puntajes recalculados.");
  }

  async function saveScoring(e: React.FormEvent) {
    e.preventDefault();
    setScoringMsg("");
    const res = await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminUid: user?.uid, scoring }),
    });
    const data = await res.json();
    setScoringMsg(res.ok ? "✓ Puntajes guardados" : `✗ ${data.error}`);
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateMsg("");
    setCreating(true);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: newName, username: newUsername, password: newPassword, adminUid: user?.uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreateMsg(`✓ "${newName}" creado. Usuario: ${newUsername} / Pass: ${newPassword}`);
      setNewName(""); setNewUsername(""); setNewPassword("");
      setUsers(prev => [...prev, { uid: data.uid, display_name: newName, total_points: 0 }]);
    } catch (err: unknown) {
      setCreateMsg(`✗ ${err instanceof Error ? err.message : "Error"}`);
    } finally {
      setCreating(false);
    }
  }

  const stages = [
    { key: "group", label: "Grupos" }, { key: "round_of_32", label: "32avos" },
    { key: "round_of_16", label: "16avos" }, { key: "quarterfinal", label: "Cuartos" },
    { key: "semifinal", label: "Semis" }, { key: "third_place", label: "3° Puesto" }, { key: "final", label: "Final" },
  ];

  if (loading) return null;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Panel de Admin</h1>
        <div className="flex gap-2 mb-6 bg-gray-800 p-1 rounded-xl w-fit">
          {(["fixture","users","scoring"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"}`}>
              {t === "fixture" ? "Fixture y Resultados" : t === "users" ? "Usuarios" : "Puntajes"}
            </button>
          ))}
        </div>

        {tab === "users" && (
          <div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Crear usuario</h2>
              <form onSubmit={createUser} className="space-y-3">
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required placeholder="Nombre o apodo" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500" />
                <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} required placeholder="Usuario (ej: pedro)" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500" />
                <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6} placeholder="Contraseña" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500" />
                {createMsg && <p className={`text-sm rounded-lg px-3 py-2 ${createMsg.startsWith("✓") ? "text-green-400 bg-green-900/20 border border-green-800" : "text-red-400 bg-red-900/20 border border-red-800"}`}>{createMsg}</p>}
                <button type="submit" disabled={creating} className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors">
                  {creating ? "Creando..." : "Crear usuario"}
                </button>
              </form>
            </div>
            <h2 className="text-lg font-semibold mb-3">Participantes ({users.length})</h2>
            <div className="space-y-2">
              {users.map(u => {
                const name = getDisplayName(u.display_name);
                const photo = getPhoto(u.display_name);
                return (
                  <div key={u.uid} className="flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                    {photo ? (
                      <img src={photo} alt={name} className="w-8 h-8 rounded-full object-cover border border-gray-700 flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-400 flex-shrink-0">
                        {name[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <p className="font-medium flex-1">{name}</p>
                    <span className="text-green-400 font-bold">{u.total_points} pts</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "fixture" && (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              <button onClick={syncFromAPI} disabled={syncing} className="text-sm bg-green-700 hover:bg-green-600 disabled:opacity-50 px-3 py-2 rounded-lg font-semibold">{syncing ? "Sincronizando..." : "Sync desde FIFA"}</button>
              <button onClick={seedFixture} disabled={seeding} className="text-sm bg-blue-700 hover:bg-blue-600 disabled:opacity-50 px-3 py-2 rounded-lg">{seeding ? "Cargando..." : "Cargar Fixture local"}</button>
              <button onClick={recalculateAll} disabled={recalculating} className="text-sm bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 px-3 py-2 rounded-lg">{recalculating ? "Calculando..." : "Recalcular Puntajes"}</button>
            </div>
            {syncMsg && <p className={`text-sm mb-4 px-3 py-2 rounded-lg ${syncMsg.startsWith("✓") ? "text-green-400 bg-green-900/20 border border-green-800" : "text-red-400 bg-red-900/20 border border-red-800"}`}>{syncMsg}</p>}
            <div className="flex flex-wrap gap-2 mb-6">
              {stages.map(s => (
                <button key={s.key} onClick={() => setActiveStage(s.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeStage === s.key ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
                  {s.label}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {matches.filter(m => m.stage === activeStage).map(match => {
                const draft = drafts[match.id];
                const homeVal = draft?.home ?? (match.homeScore !== null ? String(match.homeScore) : "");
                const awayVal = draft?.away ?? (match.awayScore !== null ? String(match.awayScore) : "");
                return (
                  <div key={match.id} className={`bg-gray-900 border rounded-xl p-4 ${match.finished ? "border-green-900" : "border-gray-800"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500">{match.stage === "group" && `Grupo ${match.group} · `}{new Date(match.datetime).toLocaleDateString("es-AR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}</span>
                      {match.finished && <span className="text-xs text-green-500 font-semibold">Finalizado</span>}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 text-right flex items-center justify-end gap-2"><span>{match.homeTeam}</span><FlagImg flag={match.homeFlag} size={22} /></div>
                      <div className="flex items-center gap-1">
                        <input type="number" min={0} max={99} value={homeVal} onChange={e => setDrafts(p => ({ ...p, [match.id]: { home: e.target.value, away: p[match.id]?.away ?? awayVal } }))} className="w-12 text-center bg-gray-800 border border-gray-700 rounded-lg py-2 text-white font-bold text-lg focus:outline-none focus:border-green-500" />
                        <span className="text-gray-500">-</span>
                        <input type="number" min={0} max={99} value={awayVal} onChange={e => setDrafts(p => ({ ...p, [match.id]: { home: p[match.id]?.home ?? homeVal, away: e.target.value } }))} className="w-12 text-center bg-gray-800 border border-gray-700 rounded-lg py-2 text-white font-bold text-lg focus:outline-none focus:border-green-500" />
                      </div>
                      <div className="flex-1 flex items-center gap-2"><FlagImg flag={match.awayFlag} size={22} /><span>{match.awayTeam}</span></div>
                      <button onClick={() => saveResult(match.id)} disabled={saving === match.id || !drafts[match.id]} className="text-sm bg-green-700 hover:bg-green-600 disabled:opacity-40 px-3 py-2 rounded-lg">
                        {saving === match.id ? "..." : "Guardar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "scoring" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-1">Sistema de puntajes</h2>
            <p className="text-sm text-gray-500 mb-6">Se aplica solo el puntaje más alto que corresponda.</p>
            <form onSubmit={saveScoring} className="space-y-4">
              {[
                { key: "exact", label: "Resultado exacto", desc: "Ej: predijo 2-1, salió 2-1" },
                { key: "winner", label: "Ganador correcto", desc: "Ej: predijo 2-1, salió 3-1" },
                { key: "draw", label: "Empate correcto", desc: "Ej: predijo 1-1, salió 0-0" },
                { key: "goalDiff", label: "Diferencia de goles", desc: "Ej: predijo 2-0, salió 3-1" },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-white">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min={0} max={99}
                      value={scoring[key as keyof ScoringConfig]}
                      onChange={e => setScoring(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                      className="w-16 text-center bg-gray-800 border border-gray-700 rounded-lg py-2 text-white font-bold text-lg focus:outline-none focus:border-green-500"
                    />
                    <span className="text-gray-500 text-sm">pts</span>
                  </div>
                </div>
              ))}
              {scoringMsg && <p className={`text-sm rounded-lg px-3 py-2 ${scoringMsg.startsWith("✓") ? "text-green-400 bg-green-900/20 border border-green-800" : "text-red-400 bg-red-900/20 border border-red-800"}`}>{scoringMsg}</p>}
              <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-lg transition-colors">
                Guardar puntajes
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
