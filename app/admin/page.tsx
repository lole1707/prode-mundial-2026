"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Match } from "@/lib/types";
import { FIXTURE } from "@/lib/fixture";
import { calculatePoints, ScoringConfig } from "@/lib/scoring";
import { DEFAULTS } from "@/app/api/config/route";
import { getDisplayName, getPhoto, getGrupos } from "@/lib/profile";
import Navbar from "@/components/Navbar";
import FlagImg from "@/components/FlagImg";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

type Tab = "fixture" | "users" | "grupos" | "scoring" | "monitor" | "pronosticos";

interface DBPrediction { user_id: string; match_id: string; home_score: number; away_score: number; }

interface MonitorData {
  tables: { users: number; matches: number; predictions: number };
  storage: { count: number; sizeBytes: number; files: { name: string; size: number }[] };
  supabaseProject: string;
  timestamp: string;
}

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
  const [newGrupo, setNewGrupo] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");
  const [scoring, setScoring] = useState<ScoringConfig>(DEFAULTS);
  const [scoringMsg, setScoringMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [groupMsg, setGroupMsg] = useState("");
  const [assignUid, setAssignUid] = useState<string | null>(null);
  const [resetUid, setResetUid] = useState<string | null>(null);
  const [resetPass, setResetPass] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ uid: string; msg: string } | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simMsg, setSimMsg] = useState("");
  const [monitor, setMonitor] = useState<MonitorData | null>(null);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [allPredictions, setAllPredictions] = useState<DBPrediction[]>([]);
  const [predictionsLoaded, setPredictionsLoaded] = useState(false);
  const [predStage, setPredStage] = useState("group");
  const [predGroup, setPredGroup] = useState<string>("");

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

    fetch("/api/admin/users")
      .then(r => r.json())
      .then((data: DBUser[]) => setUsers(data ?? []));

    fetch("/api/admin/groups")
      .then(r => r.json())
      .then((data: string[]) => setAvailableGroups(data ?? []));
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

    const res = await fetch("/api/admin/save-result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminUid: user?.uid, matches: [{ id: matchId, home, away, finished: true }] }),
    });

    if (res.ok) {
      setMatches(prev => prev.map(m => m.id === matchId ? { ...m, homeScore: home, awayScore: away, finished: true } : m));
      setDrafts(prev => { const n = { ...prev }; delete n[matchId]; return n; });
      // Refresh user list to show updated points
      fetch("/api/admin/users").then(r => r.json()).then(u => setUsers(u ?? []));
    } else {
      alert("Error al guardar resultado");
    }
    setSaving(null);
  }

  async function recalculateAll() {
    setRecalculating(true);
    try {
      const res = await fetch("/api/admin/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminUid: user?.uid, scoring }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const usersRes = await fetch("/api/admin/users");
      if (usersRes.ok) setUsers(await usersRes.json());
      alert(`✓ ${data.updated} usuarios actualizados (${data.finishedMatches} partidos finalizados).`);
    } catch (err: unknown) {
      alert(`✗ ${err instanceof Error ? err.message : "Error"}`);
    }
    setRecalculating(false);
  }

  function randomScore() {
    const goals = [0,0,0,1,1,1,1,2,2,2,3,3,4];
    return {
      home: goals[Math.floor(Math.random() * goals.length)],
      away: goals[Math.floor(Math.random() * goals.length)],
    };
  }

  async function startSimulation() {
    setSimulating(true); setSimMsg("");
    const targets = matches.filter(m => m.stage === "group");
    if (targets.length === 0) { setSimMsg("✗ Cargá el fixture primero"); setSimulating(false); return; }
    try {
      const scores = targets.map(() => randomScore());
      const payload = targets.map((m, i) => ({ id: m.id, home: scores[i].home, away: scores[i].away, finished: true }));

      // Send in batches of 20 to avoid large payloads
      const BATCH = 20;
      for (let i = 0; i < payload.length; i += BATCH) {
        const res = await fetch("/api/admin/save-result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminUid: user?.uid, matches: payload.slice(i, i + BATCH) }),
        });
        if (!res.ok) throw new Error(await res.text());
      }

      setMatches(prev => prev.map(m => {
        const idx = targets.findIndex(t => t.id === m.id);
        if (idx < 0) return m;
        return { ...m, homeScore: scores[idx].home, awayScore: scores[idx].away, finished: true };
      }));
      setSimMsg(`✓ ${targets.length} partidos de grupos simulados con resultados aleatorios.`);
    } catch { setSimMsg("✗ Error al simular"); }
    setSimulating(false);
  }

  async function clearSimulation() {
    setSimulating(true); setSimMsg("");
    const targets = matches.filter(m => m.stage === "group" && m.finished);
    try {
      const payload = targets.map(m => ({ id: m.id, home: null as unknown as number, away: null as unknown as number, finished: false }));
      await fetch("/api/admin/save-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminUid: user?.uid, matches: payload }),
      });
      setMatches(prev => prev.map(m =>
        targets.find(t => t.id === m.id) ? { ...m, homeScore: null as unknown as number, awayScore: null as unknown as number, finished: false } : m
      ));
      // Reset all users' points to 0 since no matches are finished
      await fetch("/api/admin/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminUid: user?.uid, scoring }),
      });
      const usersRes = await fetch("/api/admin/users");
      if (usersRes.ok) setUsers(await usersRes.json());
      setSimMsg("✓ Simulacro limpiado. Puntos reseteados a 0.");
    } catch { setSimMsg("✗ Error al limpiar"); }
    setSimulating(false);
  }

  async function createGroup() {
    if (!newGroupName.trim()) return;
    setGroupMsg("");
    const res = await fetch("/api/admin/groups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminUid: user?.uid, name: newGroupName.trim() }),
    });
    const data = await res.json();
    if (res.ok) { setAvailableGroups(data.groups); setNewGroupName(""); setGroupMsg("✓ Grupo creado"); }
    else setGroupMsg(`✗ ${data.error}`);
  }

  async function deleteGroup(name: string) {
    const res = await fetch("/api/admin/groups", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminUid: user?.uid, name }),
    });
    const data = await res.json();
    if (res.ok) setAvailableGroups(data.groups);
  }

  async function assignGroups(uid: string, grupos: string[]) {
    await fetch("/api/admin/assign-groups", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminUid: user?.uid, uid, grupos }),
    });
    // Refresh user list
    const r = await fetch("/api/admin/users");
    if (r.ok) setUsers(await r.json());
    setAssignUid(null);
  }

  async function handleResetPassword(uid: string) {
    if (!resetPass || resetPass.length < 4) return;
    setResetting(true);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, newPassword: resetPass, adminUid: user?.uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResetMsg({ uid, msg: `✓ Contraseña cambiada` });
      setResetUid(null);
      setResetPass("");
    } catch (err: unknown) {
      setResetMsg({ uid, msg: `✗ ${err instanceof Error ? err.message : "Error"}` });
    }
    setResetting(false);
  }

  async function deleteUser(uid: string) {
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, adminUid: user?.uid }),
      });
      if (!res.ok) { const d = await res.json(); alert(d.error); return; }
      setUsers(prev => prev.filter(u => u.uid !== uid));
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
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
        body: JSON.stringify({ displayName: newName, username: newUsername, password: newPassword, adminUid: user?.uid, grupo: newGrupo }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreateMsg(`✓ "${newName}" creado. Usuario: ${newUsername} / Pass: ${newPassword}`);
      setNewName(""); setNewUsername(""); setNewPassword(""); setNewGrupo("");
      setUsers(prev => [...prev, { uid: data.uid, display_name: newName, total_points: 0 }]);
    } catch (err: unknown) {
      setCreateMsg(`✗ ${err instanceof Error ? err.message : "Error"}`);
    } finally {
      setCreating(false);
    }
  }

  const stages = [
    { key: "group", label: "Grupos" }, { key: "round_of_32", label: "16avos" },
    { key: "round_of_16", label: "Octavos" }, { key: "quarterfinal", label: "Cuartos" },
    { key: "semifinal", label: "Semis" }, { key: "third_place", label: "3° Puesto" }, { key: "final", label: "Final" },
  ];

  if (loading) return null;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Panel de Admin</h1>
        <div className="flex flex-wrap gap-2 mb-6 bg-gray-800 p-1 rounded-xl w-fit">
          {(["fixture","users","grupos","scoring","pronosticos","monitor"] as Tab[]).map(t => (
            <button key={t} onClick={() => {
              setTab(t);
              if (t === "monitor" && !monitor) {
                setMonitorLoading(true);
                fetch("/api/admin/monitor").then(r => r.json()).then(d => { setMonitor(d); setMonitorLoading(false); });
              }
              if (t === "pronosticos" && !predictionsLoaded) {
                fetch("/api/admin/predictions").then(r => r.json()).then((d: DBPrediction[]) => { setAllPredictions(d ?? []); setPredictionsLoaded(true); });
              }
            }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"}`}>
              {t === "fixture" ? "Fixture" : t === "users" ? "Usuarios" : t === "grupos" ? "Grupos" : t === "scoring" ? "Puntajes" : t === "pronosticos" ? "Pronósticos" : "📊 Monitor"}
            </button>
          ))}
        </div>

        {tab === "users" && (
          <div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Crear usuario</h2>
              <form onSubmit={createUser} className="space-y-3">
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required placeholder="Nombre y Apellido" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500" />
                <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} required placeholder="Usuario (ej: pedro)" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500" />
                <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={4} placeholder="Contraseña (mín. 4 caracteres)" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500" />
                <select value={newGrupo} onChange={e => setNewGrupo(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500">
                  <option value="">— Grupo inicial (opcional) —</option>
                  {availableGroups.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                {createMsg && <p className={`text-sm rounded-lg px-3 py-2 ${createMsg.startsWith("✓") ? "text-green-400 bg-green-900/20 border border-green-800" : "text-red-400 bg-red-900/20 border border-red-800"}`}>{createMsg}</p>}
                <button type="submit" disabled={creating} className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors">
                  {creating ? "Creando..." : "Crear usuario"}
                </button>
              </form>
            </div>
            {(() => {
              const grupos = Array.from(new Set(users.flatMap(u => getGrupos(u.display_name).length ? getGrupos(u.display_name) : ["Sin grupo"]))).sort();
              return grupos.length > 1 ? (
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="text-xs text-gray-500 self-center">Filtrar:</span>
                  {["Todos", ...grupos].map(g => (
                    <button key={g} onClick={() => setNewGrupo(g === "Todos" ? "" : g)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${(g === "Todos" && !newGrupo) || newGrupo === g ? "bg-green-600 border-green-500 text-white" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"}`}>
                      {g}
                    </button>
                  ))}
                </div>
              ) : null;
            })()}
            <h2 className="text-lg font-semibold mb-3">Participantes ({users.filter(u => !newGrupo || getGrupos(u.display_name).includes(newGrupo) || (getGrupos(u.display_name).length === 0 && newGrupo === "Sin grupo")).length})</h2>
            <div className="space-y-2">
              {users.filter(u => !newGrupo || getGrupos(u.display_name).includes(newGrupo) || (getGrupos(u.display_name).length === 0 && newGrupo === "Sin grupo")).map(u => {
                const name = getDisplayName(u.display_name);
                const photo = getPhoto(u.display_name);
                const grupos = getGrupos(u.display_name);
                const isConfirming = confirmDelete === u.uid;
                return (
                  <div key={u.uid} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      {photo ? (
                        <img src={photo} alt={name} className="w-8 h-8 rounded-full object-cover border border-gray-700 flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-400 flex-shrink-0">
                          {name[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{name}</p>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {grupos.map(g => (
                            <span key={g} className="text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">{g}</span>
                          ))}
                          {grupos.length === 0 && <span className="text-xs text-gray-600">Sin grupo</span>}
                        </div>
                      </div>
                      <span className="text-green-400 font-bold mr-2">{u.total_points} pts</span>
                      {/* Assign groups button */}
                      <button onClick={() => setAssignUid(assignUid === u.uid ? null : u.uid)}
                        className="text-xs text-gray-500 hover:text-green-400 transition-colors px-2 py-1 rounded hover:bg-green-900/20">
                        👥
                      </button>

                      {/* Reset password button */}
                      <button onClick={() => { setResetUid(resetUid === u.uid ? null : u.uid); setResetPass(""); setResetMsg(null); }}
                        className="text-xs text-gray-500 hover:text-blue-400 transition-colors px-2 py-1 rounded hover:bg-blue-900/20">
                        🔑
                      </button>

                      {!isConfirming ? (
                        <button onClick={() => setConfirmDelete(u.uid)} className="text-xs text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-900/20">
                          🗑
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-400">¿Borrar?</span>
                          <button onClick={() => deleteUser(u.uid)} disabled={deleting} className="text-xs bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white px-2 py-1 rounded">
                            {deleting ? "..." : "Sí"}
                          </button>
                          <button onClick={() => setConfirmDelete(null)} className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded">
                            No
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Inline reset password form */}
                    {resetUid === u.uid && (
                      <div className="mt-3 flex items-center gap-2 border-t border-gray-800 pt-3">
                        <input
                          type="text"
                          value={resetPass}
                          onChange={e => setResetPass(e.target.value)}
                          placeholder="Nueva contraseña (mín. 4)"
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                        <button onClick={() => handleResetPassword(u.uid)} disabled={resetting || resetPass.length < 4}
                          className="text-xs bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white px-3 py-2 rounded-lg">
                          {resetting ? "..." : "Cambiar"}
                        </button>
                        <button onClick={() => { setResetUid(null); setResetPass(""); }}
                          className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg">
                          ✕
                        </button>
                      </div>
                    )}
                    {resetMsg?.uid === u.uid && (
                      <p className={`text-xs mt-1 ${resetMsg.msg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{resetMsg.msg}</p>
                    )}

                    {/* Inline assign groups */}
                    {assignUid === u.uid && (
                      <div className="mt-3 border-t border-gray-800 pt-3">
                        <p className="text-xs text-gray-400 mb-2">Grupos del usuario</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {availableGroups.map(g => {
                            const inGroup = grupos.includes(g);
                            return (
                              <label key={g} className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full border cursor-pointer transition-colors ${inGroup ? "bg-green-700 border-green-600 text-white" : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"}`}>
                                <input type="checkbox" className="hidden" checked={inGroup}
                                  onChange={() => {
                                    const next = inGroup ? grupos.filter(x => x !== g) : [...grupos, g];
                                    assignGroups(u.uid, next);
                                  }}
                                />
                                {g}
                              </label>
                            );
                          })}
                        </div>
                        {availableGroups.length === 0 && <p className="text-xs text-gray-600">Crea grupos en la pestaña Grupos primero.</p>}
                        <button onClick={() => setAssignUid(null)} className="text-xs text-gray-500 hover:text-white">Cerrar</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "grupos" && (
          <div className="space-y-6">
            {/* Create group */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4">Crear grupo</h2>
              <div className="flex gap-3">
                <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && createGroup()}
                  placeholder="Nombre del grupo (ej: Trabajo, Familia...)"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500" />
                <button onClick={createGroup} className="bg-green-600 hover:bg-green-500 text-white font-semibold px-5 py-3 rounded-lg transition-colors">
                  Crear
                </button>
              </div>
              {groupMsg && <p className={`text-sm mt-2 ${groupMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{groupMsg}</p>}
            </div>

            {/* Group list */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4">Grupos existentes ({availableGroups.length})</h2>
              {availableGroups.length === 0 ? (
                <p className="text-gray-500 text-sm">Aún no hay grupos creados.</p>
              ) : (
                <div className="space-y-2">
                  {availableGroups.map(g => {
                    const count = users.filter(u => getGrupos(u.display_name).includes(g)).length;
                    return (
                      <div key={g} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-3">
                        <div>
                          <p className="font-medium text-white">{g}</p>
                          <p className="text-xs text-gray-500">{count} participante{count !== 1 ? "s" : ""}</p>
                        </div>
                        <button onClick={() => deleteGroup(g)}
                          className="text-xs text-gray-500 hover:text-red-400 px-2 py-1 rounded hover:bg-red-900/20 transition-colors">
                          🗑 Eliminar
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
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

            {/* Simulacro de prueba */}
            <div className="bg-gray-900 border border-yellow-800/40 rounded-xl p-4 mb-4">
              <p className="text-sm font-semibold text-yellow-400 mb-1">🧪 Simulacro de prueba</p>
              <p className="text-xs text-gray-500 mb-3">Carga resultados aleatorios en todos los partidos de la fase de grupos (72 partidos) para probar pronósticos y puntajes. Después limpialo para dejarlo listo.</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={startSimulation} disabled={simulating} className="text-sm bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 px-3 py-2 rounded-lg font-semibold">
                  {simulating ? "..." : "▶ Iniciar simulacro"}
                </button>
                <button onClick={clearSimulation} disabled={simulating} className="text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-3 py-2 rounded-lg">
                  {simulating ? "..." : "✕ Limpiar simulacro"}
                </button>
              </div>
              {simMsg && <p className={`text-xs mt-2 ${simMsg.startsWith("✓") ? "text-green-400" : "text-red-400"}`}>{simMsg}</p>}
            </div>
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
                      <span className="text-xs text-gray-500">{match.stage === "group" && `Grupo ${match.group} · `}{new Date(match.datetime).toLocaleDateString("es-AR", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit", timeZone:"America/Argentina/Buenos_Aires" })}</span>
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

        {tab === "pronosticos" && (() => {
          const stageMatches = matches.filter(m => m.stage === predStage).sort((a, b) => a.matchNumber - b.matchNumber);
          const groupsInStage = predStage === "group"
            ? Array.from(new Set(stageMatches.map(m => m.group).filter((g): g is string => !!g))).sort()
            : [];
          const visibleMatches = predGroup ? stageMatches.filter(m => m.group === predGroup) : stageMatches;
          const predMap: Record<string, Record<string, { home: number; away: number }>> = {};
          allPredictions.forEach(p => {
            (predMap[p.user_id] ??= {})[p.match_id] = { home: p.home_score, away: p.away_score };
          });
          return (
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                {stages.map(s => (
                  <button key={s.key} onClick={() => { setPredStage(s.key); setPredGroup(""); }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${predStage === s.key ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
              {groupsInStage.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {["Todos", ...groupsInStage].map(g => (
                    <button key={g} onClick={() => setPredGroup(g === "Todos" ? "" : g)}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${(g === "Todos" && !predGroup) || predGroup === g ? "bg-green-600 border-green-500 text-white" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"}`}>
                      {g}
                    </button>
                  ))}
                </div>
              )}
              {!predictionsLoaded ? (
                <p className="text-sm text-gray-500">Cargando pronósticos...</p>
              ) : visibleMatches.length === 0 ? (
                <p className="text-sm text-gray-500">No hay partidos en esta fase.</p>
              ) : (
                <div className="overflow-x-auto border border-gray-800 rounded-xl">
                  <table className="border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 bg-gray-900 border-b border-r border-gray-800 px-3 py-2 text-left whitespace-nowrap">Usuario</th>
                        {visibleMatches.map(m => (
                          <th key={m.id} className="border-b border-gray-800 px-2 py-2 text-center whitespace-nowrap font-normal min-w-[84px]">
                            <div className="flex items-center justify-center gap-1">
                              <FlagImg flag={m.homeFlag} size={16} /><FlagImg flag={m.awayFlag} size={16} />
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5">#{m.matchNumber}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u, i) => {
                        const name = getDisplayName(u.display_name);
                        return (
                          <tr key={u.uid} className={i % 2 === 0 ? "bg-gray-900/40" : "bg-gray-900/10"}>
                            <td className="sticky left-0 z-10 bg-gray-900 border-r border-gray-800 px-3 py-2 whitespace-nowrap font-medium">{name}</td>
                            {visibleMatches.map(m => {
                              const p = predMap[u.uid]?.[m.id];
                              return (
                                <td key={m.id} className="px-2 py-2 text-center text-gray-300">
                                  {p ? `${p.home}-${p.away}` : <span className="text-gray-700">—</span>}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}

        {tab === "monitor" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Monitor Supabase</h2>
              <button onClick={() => { setMonitorLoading(true); fetch("/api/admin/monitor").then(r => r.json()).then(d => { setMonitor(d); setMonitorLoading(false); }); }}
                className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors">
                {monitorLoading ? "Actualizando..." : "↻ Actualizar"}
              </button>
            </div>

            {monitorLoading && !monitor && (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-500" /></div>
            )}

            {monitor && (() => {
              const fmt = (b: number) => b < 1024 ? `${b} B` : b < 1024*1024 ? `${(b/1024).toFixed(1)} KB` : `${(b/1024/1024).toFixed(2)} MB`;
              const storageLimit = 1024 * 1024 * 1024; // 1 GB free plan
              const storagePct = Math.min((monitor.storage.sizeBytes / storageLimit) * 100, 100);
              const projectRef = monitor.supabaseProject.replace("https://", "").replace(".supabase.co", "");
              const updatedAt = new Date(monitor.timestamp).toLocaleTimeString("es-AR");

              return (
                <>
                  {/* DB rows */}
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">Base de datos</h3>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: "Usuarios", val: monitor.tables.users, icon: "👥" },
                        { label: "Partidos", val: monitor.tables.matches, icon: "⚽" },
                        { label: "Pronósticos", val: monitor.tables.predictions, icon: "📝" },
                      ].map(({ label, val, icon }) => (
                        <div key={label} className="bg-gray-800 rounded-xl p-3 text-center">
                          <div className="text-xl mb-1">{icon}</div>
                          <p className="text-2xl font-bold text-white">{val}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Storage */}
                  <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-4">Storage · Bucket avatars</h3>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-800 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-white">{monitor.storage.count}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Archivos</p>
                      </div>
                      <div className="bg-gray-800 rounded-xl p-3 text-center">
                        <p className="text-2xl font-bold text-white">{fmt(monitor.storage.sizeBytes)}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Tamaño total</p>
                      </div>
                    </div>
                    <div className="mb-1 flex justify-between text-xs text-gray-500">
                      <span>Uso de storage (plan gratis: 1 GB)</span>
                      <span>{storagePct.toFixed(2)}%</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${storagePct > 80 ? "bg-red-500" : storagePct > 50 ? "bg-yellow-500" : "bg-green-500"}`}
                        style={{ width: `${Math.max(storagePct, 0.5)}%` }} />
                    </div>
                    {monitor.storage.files.length > 0 && (
                      <details className="mt-4">
                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">Ver archivos ({monitor.storage.files.length})</summary>
                        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                          {monitor.storage.files.map(f => (
                            <div key={f.name} className="flex justify-between text-xs text-gray-400 bg-gray-800 px-3 py-1.5 rounded-lg">
                              <span className="truncate mr-2">{f.name}</span>
                              <span className="flex-shrink-0">{fmt(f.size)}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>

                  {/* Egress — link to Supabase dashboard */}
                  <div className="bg-gray-900 border border-yellow-800/40 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Egress (transferencia)</h3>
                    <p className="text-xs text-gray-500 mb-3">El egress exacto se monitorea en el panel de Supabase. Plan gratis: 5 GB/mes.</p>
                    <a
                      href={`https://supabase.com/dashboard/project/${projectRef}/settings/billing`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-lg transition-colors">
                      📈 Ver egress en Supabase →
                    </a>
                  </div>

                  <p className="text-xs text-gray-600 text-right">Última actualización: {updatedAt}</p>
                </>
              );
            })()}
          </div>
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
