"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Match, Prediction } from "@/lib/types";
import { calculatePoints, ScoringConfig } from "@/lib/scoring";
import { DEFAULTS } from "@/app/api/config/route";
import { getDisplayName, getPhoto, parseProfile, getGrupos } from "@/lib/profile";
import Navbar from "@/components/Navbar";
import FlagImg from "@/components/FlagImg";
import EditProfileModal from "@/components/EditProfileModal";

type MainTab = "resultados" | "pronosticos" | "migrupo" | "posiciones" | "calendario" | "miperfil";

const STAGES = [
  { key: "group", label: "Grupos" },
  { key: "round_of_32", label: "16avos" },
  { key: "round_of_16", label: "Octavos" },
  { key: "quarterfinal", label: "Cuartos" },
  { key: "semifinal", label: "Semis" },
  { key: "third_place", label: "3° Puesto" },
  { key: "final", label: "Final" },
];
const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

interface LeaderboardUser { uid: string; display_name: string; total_points: number; }

function Avatar({ photo, name, size }: { photo?: string; name: string; size: "lg" | "sm" }) {
  if (size === "lg") {
    return photo
      ? <img src={photo} alt={name} className="w-28 h-[157px] rounded-xl object-cover border-2 border-yellow-400 shadow-lg flex-shrink-0" />
      : <div className="w-28 h-[157px] rounded-xl bg-gray-700 border-2 border-yellow-400 flex items-center justify-center text-3xl font-bold text-gray-300 flex-shrink-0">{name[0]?.toUpperCase() ?? "?"}</div>;
  }
  return photo
    ? <img src={photo} alt={name} className="w-10 h-14 rounded-lg object-cover border border-gray-600 flex-shrink-0" />
    : <div className="w-10 h-14 rounded-lg bg-gray-700 border border-gray-600 flex items-center justify-center text-sm font-bold text-gray-300 flex-shrink-0">{name[0]?.toUpperCase() ?? "?"}</div>;
}

export default function Dashboard() {
  const { user, loading, isAdmin, completeProfile } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<MainTab>("pronosticos");
  const [stage, setStage] = useState("group");
  const [group, setGroup] = useState("A");

  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [drafts, setDrafts] = useState<Record<string, { home: string; away: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [scoring, setScoring] = useState<ScoringConfig>(DEFAULTS);

  const [lbUsers, setLbUsers] = useState<LeaderboardUser[]>([]);
  const [lbLoaded, setLbLoaded] = useState(false);
  const [groupMembers, setGroupMembers] = useState<LeaderboardUser[]>([]);
  const [groupPreds, setGroupPreds] = useState<{ user_id: string; match_id: string; home_score: number; away_score: number }[]>([]);
  const [lbGrupo, setLbGrupo] = useState<string>("__mi_grupo__");
  const [editingProfile, setEditingProfile] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && user && !user.profileCompleted && !isAdmin) router.push("/profile");
  }, [user, loading, router, isAdmin]);

  // Fetch fresh matches, predictions AND leaderboard (points)
  async function refreshMatches() {
    if (!user) return;
    const [cfgRes, matchRes, predRes, lbRes] = await Promise.all([
      fetch("/api/config"),
      fetch("/api/matches"),
      fetch(`/api/predictions?userId=${user.uid}`),
      fetch("/api/admin/users"),
    ]);
    if (cfgRes.ok) setScoring(await cfgRes.json());
    if (matchRes.ok) {
      const data = await matchRes.json() as Record<string, unknown>[];
      setMatches(data.map(m => ({
        id: m.id as string, homeTeam: m.home_team as string, awayTeam: m.away_team as string,
        homeFlag: m.home_flag as string, awayFlag: m.away_flag as string,
        stage: m.stage as Match["stage"], group: m.group_name as string,
        matchNumber: m.match_number as number, datetime: m.datetime as string,
        venue: m.venue as string, homeScore: m.home_score as number,
        awayScore: m.away_score as number, finished: m.finished as boolean,
      })));
    }
    if (predRes.ok) {
      const predData = await predRes.json() as Record<string, unknown>[];
      const map: Record<string, Prediction> = {};
      predData.forEach(p => {
        map[p.match_id as string] = {
          id: p.id as string, userId: p.user_id as string, matchId: p.match_id as string,
          homeScore: p.home_score as number, awayScore: p.away_score as number,
          createdAt: p.created_at as string, updatedAt: p.updated_at as string,
        };
      });
      setPredictions(map);
    }
    if (lbRes.ok) {
      const data: LeaderboardUser[] = await lbRes.json();
      const sorted = (data ?? []).sort((a, b) =>
        b.total_points - a.total_points || getDisplayName(a.display_name).localeCompare(getDisplayName(b.display_name))
      );
      setLbUsers(sorted);
      setLbLoaded(true);
    }
  }

  useEffect(() => {
    if (!user) return;
    async function load() {
      const [cfgRes, matchRes] = await Promise.all([fetch("/api/config"), fetch("/api/matches")]);
      if (cfgRes.ok) setScoring(await cfgRes.json());
      if (matchRes.ok) {
        const data = await matchRes.json() as Record<string, unknown>[];
        setMatches(data.map(m => ({
          id: m.id as string, homeTeam: m.home_team as string, awayTeam: m.away_team as string,
          homeFlag: m.home_flag as string, awayFlag: m.away_flag as string,
          stage: m.stage as Match["stage"], group: m.group_name as string,
          matchNumber: m.match_number as number, datetime: m.datetime as string,
          venue: m.venue as string, homeScore: m.home_score as number,
          awayScore: m.away_score as number, finished: m.finished as boolean,
        })));
      }
      const predRes = await fetch(`/api/predictions?userId=${user!.uid}`);
      if (predRes.ok) {
        const predData = await predRes.json() as Record<string, unknown>[];
        const map: Record<string, Prediction> = {};
        predData.forEach(p => {
          map[p.match_id as string] = {
            id: p.id as string, userId: p.user_id as string, matchId: p.match_id as string,
            homeScore: p.home_score as number, awayScore: p.away_score as number,
            createdAt: p.created_at as string, updatedAt: p.updated_at as string,
          };
        });
        setPredictions(map);
      }
    }
    load();
  }, [user]);

  // Real-time updates: Supabase Realtime push + refresh on tab focus (no polling)
  useEffect(() => {
    if (!user) return;
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null;

    // Try to use Supabase Realtime (requires Realtime enabled on matches table in Supabase dashboard)
    import("@supabase/supabase-js").then(({ createClient }) => {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      channel = supabase
        .channel("matches-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, () => {
          refreshMatches();
        })
        .subscribe();
    }).catch(() => {});

    // Refresh when the tab regains focus (covers cases where Realtime missed an update while hidden)
    const onVisible = () => { if (document.visibilityState === "visible") refreshMatches(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      channel?.unsubscribe?.();
      document.removeEventListener("visibilitychange", onVisible);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fetch group predictions when switching to migrupo
  useEffect(() => {
    if (tab !== "migrupo" || !user) return;
    fetch(`/api/group-predictions?userId=${user.uid}`)
      .then(r => r.json())
      .then(d => { setGroupMembers(d.members ?? []); setGroupPreds(d.predictions ?? []); })
      .catch(() => {});
  }, [tab, user]);

  // Re-fetch matches+predictions when switching to resultados, pronosticos, calendario or miperfil
  useEffect(() => {
    if (!["resultados", "pronosticos", "calendario", "miperfil"].includes(tab) || !user) return;
    Promise.all([fetch("/api/matches"), fetch(`/api/predictions?userId=${user.uid}`)]).then(async ([mr, pr]) => {
      if (mr.ok) {
        const data = await mr.json() as Record<string, unknown>[];
        setMatches(data.map(m => ({
          id: m.id as string, homeTeam: m.home_team as string, awayTeam: m.away_team as string,
          homeFlag: m.home_flag as string, awayFlag: m.away_flag as string,
          stage: m.stage as Match["stage"], group: m.group_name as string,
          matchNumber: m.match_number as number, datetime: m.datetime as string,
          venue: m.venue as string, homeScore: m.home_score as number,
          awayScore: m.away_score as number, finished: m.finished as boolean,
        })));
      }
      if (pr.ok) {
        const predData = await pr.json() as Record<string, unknown>[];
        const map: Record<string, Prediction> = {};
        predData.forEach(p => {
          map[p.match_id as string] = {
            id: p.id as string, userId: p.user_id as string, matchId: p.match_id as string,
            homeScore: p.home_score as number, awayScore: p.away_score as number,
            createdAt: p.created_at as string, updatedAt: p.updated_at as string,
          };
        });
        setPredictions(map);
      }
    });
  }, [tab, user]);

  useEffect(() => {
    if (tab !== "posiciones" && tab !== "miperfil") return;
    if (lbLoaded && tab === "posiciones") return; // posiciones: load once; miperfil: always refresh
    fetch("/api/admin/users")
      .then(r => r.json())
      .then((data: LeaderboardUser[]) => {
        const sorted = (data ?? []).sort((a, b) =>
          b.total_points - a.total_points || getDisplayName(a.display_name).localeCompare(getDisplayName(b.display_name))
        );
        setLbUsers(sorted);
        setLbLoaded(true);
      });
  }, [tab, lbLoaded]);

  async function savePrediction(matchId: string) {
    if (!user) return;
    const draft = drafts[matchId];
    if (!draft) return;
    const home = parseInt(draft.home), away = parseInt(draft.away);
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) return;
    setSaving(matchId);
    const now = new Date().toISOString();
    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.uid, match_id: matchId, home_score: home, away_score: away, updated_at: now, created_at: predictions[matchId]?.createdAt ?? now }),
    });
    if (res.ok) {
      const rows = await res.json() as Record<string, unknown>[];
      const saved = rows[0];
      setPredictions(prev => ({ ...prev, [matchId]: { id: saved?.id as string, userId: user.uid, matchId, homeScore: home, awayScore: away, createdAt: predictions[matchId]?.createdAt ?? now, updatedAt: now } }));
    }
    setDrafts(prev => { const n = { ...prev }; delete n[matchId]; return n; });
    setSaving(null);
  }

  async function deletePrediction(matchId: string) {
    if (!user) return;
    setSaving(matchId);
    await fetch(`/api/predictions?userId=${user.uid}&matchId=${matchId}`, { method: "DELETE" });
    setPredictions(prev => { const n = { ...prev }; delete n[matchId]; return n; });
    setDrafts(prev => { const n = { ...prev }; delete n[matchId]; return n; });
    setSaving(null);
  }

  function formatCountdown(ms: number): string {
    const totalSecs = Math.ceil(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  const visibleMatches = stage === "group"
    ? matches.filter(m => m.stage === "group" && m.group === group)
    : matches.filter(m => m.stage === stage);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-green-500" /></div>;

  const medals = ["🥇","🥈","🥉"];

  return (
    <div className="min-h-screen pb-20">
      <Navbar />

      <div className={`mx-auto px-4 py-5 ${(isAdmin && tab === "posiciones") ? "max-w-6xl" : "max-w-2xl"}`}>

        {/* Stage + Group selectors */}
        {tab !== "posiciones" && tab !== "calendario" && tab !== "migrupo" && (
          <>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {STAGES.map(s => (
                <button key={s.key} onClick={() => setStage(s.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${stage === s.key ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
                  {s.label}
                </button>
              ))}
            </div>
            {stage === "group" && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {GROUPS.map(g => (
                  <button key={g} onClick={() => setGroup(g)}
                    className={`w-9 h-9 rounded-lg text-sm font-bold transition-colors ${group === g ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
                    {g}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* RESULTADOS */}
        {tab === "resultados" && (
          <div className="space-y-3">
            {visibleMatches.length === 0 && <p className="text-gray-500 text-center py-8">No hay partidos en esta etapa.</p>}
            {visibleMatches.map(m => {
              const isLive = !m.finished && m.homeScore !== null && m.awayScore !== null;
              return (
              <div key={m.id} className={`bg-gray-900 border rounded-xl p-4 ${m.finished ? "border-gray-700" : isLive ? "border-red-700" : "border-gray-800"}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-500">{stage === "group" ? `Grupo ${m.group} · ` : ""}{new Date(m.datetime).toLocaleDateString("es-AR", { weekday:"short", day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit", hour12: false, timeZone:"America/Argentina/Buenos_Aires" })}</span>
                  {m.finished
                    ? <span className="text-xs text-green-500 font-semibold">Finalizado</span>
                    : isLive
                    ? <span className="text-xs text-red-400 font-semibold animate-pulse">🔴 En vivo</span>
                    : <span className="text-xs text-gray-500">{m.venue}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex flex-col items-end gap-1">
                    <FlagImg flag={m.homeFlag} size={28} />
                    <p className="text-sm font-semibold text-white text-right">{m.homeTeam}</p>
                  </div>
                  <div className="text-center min-w-[60px]">
                    {m.finished || isLive
                      ? <div className={`text-2xl font-bold ${isLive ? "text-red-300" : "text-white"}`}>{m.homeScore} - {m.awayScore}</div>
                      : <div className="text-sm text-gray-600 font-bold">vs</div>}
                  </div>
                  <div className="flex-1 flex flex-col items-start gap-1">
                    <FlagImg flag={m.awayFlag} size={28} />
                    <p className="text-sm font-semibold text-white">{m.awayTeam}</p>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {/* MIS PRONÓSTICOS */}
        {tab === "pronosticos" && (
          <div className="space-y-3">
            {visibleMatches.length === 0 && <p className="text-gray-500 text-center py-8">No hay partidos en esta etapa.</p>}
            {visibleMatches.map(m => {
              const pred = predictions[m.id];
              const draft = drafts[m.id];
              const isFinished = m.finished && m.homeScore !== null && m.awayScore !== null;
              const isLive = !m.finished && m.homeScore !== null && m.awayScore !== null;
              const cutoff = new Date(new Date(m.datetime).getTime() - 30 * 60 * 1000);
              const msLeft = cutoff.getTime() - now.getTime();
              const isPast = msLeft <= 0;
              const canPredict = !isPast && !isFinished;
              const closingSoon = canPredict && msLeft <= 30 * 60 * 1000;
              const pts = isFinished && pred ? calculatePoints(pred.homeScore, pred.awayScore, m.homeScore!, m.awayScore!, scoring) : null;
              const homeVal = draft?.home ?? (pred ? String(pred.homeScore) : "");
              const awayVal = draft?.away ?? (pred ? String(pred.awayScore) : "");
              return (
                <div key={m.id} className={`bg-gray-900 border rounded-xl p-4 ${isFinished ? "border-gray-700" : isLive ? "border-red-700" : closingSoon ? "border-orange-700" : "border-gray-800"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500">{new Date(m.datetime).toLocaleDateString("es-AR", { weekday:"short", day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit", hour12: false, timeZone:"America/Argentina/Buenos_Aires" })}</span>
                    {isLive && <span className="text-xs text-red-400 font-semibold animate-pulse">🔴 En vivo</span>}
                    {closingSoon && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-900/50 text-orange-400 border border-orange-700 animate-pulse">
                        ⏰ Cierra en {formatCountdown(msLeft)}
                      </span>
                    )}
                    {isFinished && pred && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pts! > 0 ? "bg-green-900/50 text-green-400" : "bg-gray-800 text-gray-500"}`}>{pts} pts</span>
                    )}
                    {isPast && !isFinished && !pred && <span className="text-xs text-red-500">Cerrado sin pronóstico</span>}
                    {isPast && !isFinished && pred && <span className="text-xs text-gray-500">Cerrado</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 flex flex-col items-end gap-1">
                      <FlagImg flag={m.homeFlag} size={28} />
                      <p className="text-sm font-semibold text-white text-right">{m.homeTeam}</p>
                    </div>
                    <div className="text-center space-y-1 min-w-[80px]">
                      {isFinished ? (
                        <div className="text-xl font-bold text-white">{m.homeScore} - {m.awayScore}</div>
                      ) : isLive ? (
                        <div className="text-xl font-bold text-red-300">{m.homeScore} - {m.awayScore}</div>
                      ) : canPredict ? (
                        <div className="flex items-center gap-1">
                          <input type="number" min={0} max={99} value={homeVal}
                            onChange={e => setDrafts(p => ({ ...p, [m.id]: { home: e.target.value, away: p[m.id]?.away ?? awayVal } }))}
                            className="w-11 text-center bg-gray-800 border border-gray-700 rounded-lg py-1.5 text-white font-bold focus:outline-none focus:border-green-500" />
                          <span className="text-gray-600">-</span>
                          <input type="number" min={0} max={99} value={awayVal}
                            onChange={e => setDrafts(p => ({ ...p, [m.id]: { home: p[m.id]?.home ?? homeVal, away: e.target.value } }))}
                            className="w-11 text-center bg-gray-800 border border-gray-700 rounded-lg py-1.5 text-white font-bold focus:outline-none focus:border-green-500" />
                        </div>
                      ) : (
                        pred
                          ? <div className="text-sm text-gray-400 font-semibold">{pred.homeScore} - {pred.awayScore}</div>
                          : <div className="text-xs text-gray-600">—</div>
                      )}
                      {isFinished && pred && <div className="text-xs text-gray-500">Pronóstico: {pred.homeScore}-{pred.awayScore}</div>}
                    </div>
                    <div className="flex-1 flex flex-col items-start gap-1">
                      <FlagImg flag={m.awayFlag} size={28} />
                      <p className="text-sm font-semibold text-white">{m.awayTeam}</p>
                    </div>
                  </div>
                  {canPredict && (
                    <div className="mt-3 flex justify-between items-center">
                      {/* Delete prediction — same cutoff as save (30 min before kickoff) */}
                      {canPredict && predictions[m.id] && !drafts[m.id] && (
                        <button onClick={() => deletePrediction(m.id)} disabled={saving === m.id}
                          className="text-xs text-gray-500 hover:text-red-400 disabled:opacity-50 px-2 py-1.5 rounded-lg transition-colors">
                          {saving === m.id ? "..." : "✕ Borrar pronóstico"}
                        </button>
                      )}
                      {drafts[m.id] && (
                        <button onClick={() => savePrediction(m.id)} disabled={saving === m.id}
                          className="text-xs bg-green-600 hover:bg-green-500 disabled:opacity-50 px-4 py-1.5 rounded-lg font-semibold transition-colors ml-auto">
                          {saving === m.id ? "..." : "Guardar"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* MI GRUPO */}
        {tab === "migrupo" && (() => {
          const myGrupos = getGrupos(lbUsers.find(u => u.uid === user?.uid)?.display_name ?? "");

          if (myGrupos.length === 0) return (
            <div className="text-center py-16">
              <p className="text-2xl mb-3">👥</p>
              <p className="text-gray-400 font-semibold">No pertenecés a ningún grupo</p>
              <p className="text-xs text-gray-600 mt-2">El admin te tiene que asignar a un grupo.</p>
            </div>
          );

          // Only matches where cutoff already passed (predictions closed)
          const closedMatches = [...matches]
            .filter(m => {
              const cutoff = new Date(new Date(m.datetime).getTime() - 30 * 60 * 1000);
              return cutoff < now;
            })
            .sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()); // most recent first

          if (closedMatches.length === 0) return (
            <div className="text-center py-16">
              <p className="text-2xl mb-3">🔒</p>
              <p className="text-gray-400 font-semibold">Todavía no cerró ningún pronóstico</p>
              <p className="text-xs text-gray-600 mt-2">Los pronósticos del grupo se revelan 30 minutos antes de cada partido.</p>
            </div>
          );

          // Build prediction map: userId → matchId → {home, away}
          const predMap: Record<string, Record<string, { home: number; away: number }>> = {};
          groupPreds.forEach(p => {
            (predMap[p.user_id] ??= {})[p.match_id] = { home: p.home_score, away: p.away_score };
          });

          const STAGE_LABELS: Record<string, string> = {
            group: "Grupo", round_of_32: "16avos", round_of_16: "Octavos",
            quarterfinal: "Cuartos", semifinal: "Semis", third_place: "3er Puesto", final: "Final",
          };

          return (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 px-1">Pronósticos de tu grupo · {myGrupos.join(", ")}</p>
              {closedMatches.map(m => {
                const isFinished = m.finished && m.homeScore !== null && m.awayScore !== null;
                const isLive = !m.finished && m.homeScore !== null && m.awayScore !== null;
                const stageLabel = m.stage === "group" ? `Grupo ${m.group}` : (STAGE_LABELS[m.stage] ?? m.stage);
                const time = new Date(m.datetime).toLocaleDateString("es-AR", {
                  weekday: "short", day: "2-digit", month: "short",
                  hour: "2-digit", minute: "2-digit", hour12: false,
                  timeZone: "America/Argentina/Buenos_Aires",
                });
                return (
                  <div key={m.id} className={`bg-gray-900 border rounded-xl p-4 ${isFinished ? "border-gray-700" : isLive ? "border-red-700" : "border-gray-800"}`}>
                    {/* Match header */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">{stageLabel} · {time}</span>
                      {isFinished && <span className="text-xs text-green-500 font-semibold">Finalizado</span>}
                      {isLive && <span className="text-xs text-red-400 font-semibold animate-pulse">🔴 En vivo</span>}
                    </div>
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <div className="flex items-center gap-1.5">
                        <FlagImg flag={m.homeFlag} size={22} />
                        <span className="text-sm font-semibold">{m.homeTeam}</span>
                      </div>
                      {(isFinished || isLive)
                        ? <span className={`text-lg font-bold tabular-nums ${isLive ? "text-red-300" : "text-white"}`}>{m.homeScore} - {m.awayScore}</span>
                        : <span className="text-xs text-gray-600 font-bold">vs</span>
                      }
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold">{m.awayTeam}</span>
                        <FlagImg flag={m.awayFlag} size={22} />
                      </div>
                    </div>
                    {/* Group members predictions */}
                    <div className="space-y-1.5">
                      {groupMembers.map(u => {
                        const name = getDisplayName(u.display_name);
                        const photo = getPhoto(u.display_name);
                        const p = predMap[u.uid]?.[m.id];
                        const isMe = u.uid === user?.uid;
                        const pts = isFinished && p
                          ? calculatePoints(p.home, p.away, m.homeScore!, m.awayScore!, scoring)
                          : null;
                        return (
                          <div key={u.uid} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isMe ? "bg-green-900/20 border border-green-800/40" : "bg-gray-800/50"}`}>
                            {photo
                              ? <img src={photo} alt={name} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                              : <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-400 flex-shrink-0">{name[0]?.toUpperCase()}</div>
                            }
                            <span className="flex-1 text-sm font-medium truncate">{name}{isMe && <span className="text-xs text-green-400 ml-1">(vos)</span>}</span>
                            {p
                              ? <span className="text-sm font-bold tabular-nums">{p.home} - {p.away}</span>
                              : <span className="text-xs text-gray-600">—</span>
                            }
                            {pts !== null && (
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-1 ${pts > 0 ? "bg-green-900/50 text-green-400" : "bg-gray-700 text-gray-500"}`}>
                                {pts}pts
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* CALENDARIO */}
        {tab === "calendario" && (() => {
          const sorted = [...matches].sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
          const todayKey = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });

          // Group by day
          const dayMap = new Map<string, { label: string; matches: Match[] }>();
          for (const m of sorted) {
            const key = new Date(m.datetime).toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });
            const label = new Date(m.datetime).toLocaleDateString("es-AR", {
              weekday: "long", day: "2-digit", month: "long", timeZone: "America/Argentina/Buenos_Aires",
            });
            if (!dayMap.has(key)) dayMap.set(key, { label, matches: [] });
            dayMap.get(key)!.matches.push(m);
          }

          const STAGE_LABELS: Record<string, string> = {
            group: "Grupo", round_of_32: "16avos", round_of_16: "Octavos",
            quarterfinal: "Cuartos", semifinal: "Semis", third_place: "3er Puesto", final: "Final",
          };

          if (sorted.length === 0) return <p className="text-gray-500 text-center py-12">No hay partidos cargados aún.</p>;

          return (
            <div className="space-y-6">
              {Array.from(dayMap.entries()).map(([key, { label, matches: dayMatches }]) => {
                const isToday = key === todayKey;
                return (
                  <div key={key}>
                    <div className={`flex items-center gap-2 mb-3 px-1`}>
                      <span className={`text-sm font-bold capitalize ${isToday ? "text-green-400" : "text-gray-300"}`}>{label}</span>
                      {isToday && <span className="text-xs bg-green-700 text-white px-2 py-0.5 rounded-full font-semibold">Hoy</span>}
                      <span className="flex-1 h-px bg-gray-800" />
                      <span className="text-xs text-gray-600">{dayMatches.length} partido{dayMatches.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="space-y-2">
                      {dayMatches.map(m => {
                        const time = new Date(m.datetime).toLocaleTimeString("es-AR", {
                          hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Argentina/Buenos_Aires",
                        });
                        const stageLabel = m.stage === "group"
                          ? `Grupo ${m.group}`
                          : (STAGE_LABELS[m.stage] ?? m.stage);
                        return (
                          <div key={m.id} className={`bg-gray-900 border rounded-xl px-4 py-3 flex items-center gap-3 ${m.finished ? "border-gray-700 opacity-60" : "border-gray-800"}`}>
                            <div className="text-center w-12 flex-shrink-0">
                              <p className="text-sm font-bold text-white tabular-nums">{time}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5">{stageLabel}</p>
                            </div>
                            <div className="flex-1 flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <FlagImg flag={m.homeFlag} size={20} />
                                <span className="text-sm text-white">{m.homeTeam}</span>
                              </div>
                              {m.finished
                                ? <span className="text-sm font-bold text-gray-300 tabular-nums">{m.homeScore} - {m.awayScore}</span>
                                : <span className="text-xs text-gray-600 font-bold">vs</span>
                              }
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm text-white text-right">{m.awayTeam}</span>
                                <FlagImg flag={m.awayFlag} size={20} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* POSICIONES */}
        {tab === "posiciones" && (() => {
          const myGrupos = getGrupos(lbUsers.find(u => u.uid === user?.uid)?.display_name ?? "");
          const myGrupo = myGrupos[0] ?? "";
          const grupos = Array.from(new Set(lbUsers.flatMap(u => getGrupos(u.display_name)))).sort();

          // Helper: render a ranked list for a set of users
          function GrupoList({ title, lista }: { title?: string; lista: typeof lbUsers }) {
            if (lista.length === 0) return null;
            const [first, ...rest] = lista;
            const firstName = getDisplayName(first.display_name);
            const firstPhoto = getPhoto(first.display_name);
            return (
              <div className="mb-8">
                {title && <h2 className="text-lg font-bold text-white mb-3 border-b border-gray-800 pb-2">{title}</h2>}
                <div className={`flex flex-col items-center bg-gray-900 border-2 rounded-2xl px-6 py-6 mb-3 ${first.uid === user?.uid ? "border-green-600" : "border-yellow-500/60"}`}>
                  <span className="text-3xl mb-2">🥇</span>
                  <Avatar photo={firstPhoto} name={firstName} size="lg" />
                  <p className="mt-3 text-lg font-bold text-white">{firstName} {first.uid === user?.uid && <span className="text-sm text-green-400">(vos)</span>}</p>
                  <p className="text-3xl font-bold text-green-400 mt-1">{first.total_points}</p>
                  <p className="text-xs text-gray-500">pts</p>
                </div>
                <div className="space-y-2">
                  {rest.map((u, i) => {
                    const name = getDisplayName(u.display_name);
                    const photo = getPhoto(u.display_name);
                    const pos = i + 2;
                    const isMe = u.uid === user?.uid;
                    return (
                      <div key={u.uid} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${isMe ? "bg-green-950/30 border-green-700" : "bg-gray-900 border-gray-800"}`}>
                        <span className="w-8 text-center flex-shrink-0">
                          {pos === 2 ? <span className="text-xl">🥈</span> : pos === 3 ? <span className="text-xl">🥉</span> : <span className="text-gray-500 text-sm font-medium">#{pos}</span>}
                        </span>
                        <Avatar photo={photo} name={name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">{name} {isMe && <span className="text-xs text-green-400">(vos)</span>}</p>
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

          if (!lbLoaded) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-500" /></div>;

          if (isAdmin) {
            // Admin: groups side by side in a grid
            const gruposParaMostrar = grupos.length > 0 ? grupos : [""];
            return (
              <div className="grid gap-4 items-start" style={{ gridTemplateColumns: `repeat(${Math.min(gruposParaMostrar.length, 4)}, minmax(0, 1fr))` }}>
                {gruposParaMostrar.map(g => {
                  const lista = lbUsers.filter(u => getGrupos(u.display_name).includes(g));
                  return <GrupoList key={g || "sin-grupo"} title={g || "Sin grupo"} lista={lista} />;
                })}
              </div>
            );
          }

          // Regular user: one section per group they belong to, side by side
          if (myGrupos.length === 0) {
            const lista = lbUsers;
            if (lista.length === 0) return <p className="text-gray-500 text-center py-12">Aún no hay participantes.</p>;
            return <GrupoList lista={lista} />;
          }

          return (
            <div className={`grid gap-4 items-start ${myGrupos.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
              {myGrupos.map(g => {
                const lista = lbUsers.filter(u => getGrupos(u.display_name).includes(g));
                return <GrupoList key={g} title={myGrupos.length > 1 ? g : undefined} lista={lista} />;
              })}
            </div>
          );
        })()}
      </div>

        {/* MI PERFIL */}
        {tab === "miperfil" && (() => {
          const finishedWithPred = matches.filter(m => m.finished && m.homeScore !== null && predictions[m.id]);
          const totalFinished = matches.filter(m => m.finished).length;
          const totalPredicted = Object.keys(predictions).length;

          let exactCount = 0, winnerCount = 0, zeroCount = 0, myPoints = 0;
          for (const m of finishedWithPred) {
            const pred = predictions[m.id];
            const pts = calculatePoints(pred.homeScore, pred.awayScore, m.homeScore!, m.awayScore!, scoring);
            myPoints += pts;
            if (pts >= scoring.exact) exactCount++;
            else if (pts > 0) winnerCount++;
            else zeroCount++;
          }

          const myRank = lbLoaded ? lbUsers.findIndex(u => u.uid === user?.uid) + 1 : 0;
          const myDbRow = lbUsers.find(u => u.uid === user?.uid);
          const profile = myDbRow ? parseProfile(myDbRow.display_name) : null;
          const photo = myDbRow ? getPhoto(myDbRow.display_name) : user?.photo;
          const name = profile ? `${profile.nombre} ${profile.apellido}` : user?.displayName ?? "";
          const apodo = profile?.apodo ?? user?.displayName ?? "";

          const pct = finishedWithPred.length > 0 ? Math.round(((exactCount + winnerCount) / finishedWithPred.length) * 100) : 0;

          return (
            <div className="space-y-4">
              {/* Profile card */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex items-center gap-5">
                {photo
                  ? <img src={photo} alt={apodo} className="w-24 h-[134px] rounded-xl object-cover border-2 border-green-600 flex-shrink-0" />
                  : <div className="w-20 h-20 rounded-full bg-gray-700 border-2 border-green-600 flex items-center justify-center text-3xl font-bold text-gray-300 flex-shrink-0">{apodo[0]?.toUpperCase() ?? "?"}</div>
                }
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-bold text-white truncate">{apodo}</p>
                  <p className="text-sm text-gray-400 truncate">{name}</p>
                  {profile?.sector && (
                    <span className="inline-block mt-1 text-xs font-semibold bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">
                      {profile.sector === "Administración" ? "🏢" : "🔧"} {profile.sector}
                    </span>
                  )}
                </div>
                {profile && (
                  <button onClick={() => setEditingProfile(true)}
                    className="flex-shrink-0 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors">
                    ✎ Editar
                  </button>
                )}
              </div>

              {/* Edit modal */}
              {editingProfile && profile && (
                <EditProfileModal
                  current={profile}
                  onClose={() => setEditingProfile(false)}
                  onSaved={(newApodo, newPhoto) => {
                    completeProfile(newApodo, newPhoto);
                    setLbLoaded(false); // refresh leaderboard data
                  }}
                />
              )}

              {/* Ranking + Points */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Mi posición</p>
                  <p className="text-3xl font-bold text-yellow-400">{myRank > 0 ? `#${myRank}` : "—"}</p>
                  <p className="text-xs text-gray-600 mt-1">de {lbUsers.length} participantes</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Mis puntos</p>
                  <p className="text-3xl font-bold text-green-400">{myDbRow?.total_points ?? myPoints}</p>
                  <p className="text-xs text-gray-600 mt-1">puntos totales</p>
                </div>
              </div>

              {/* Prediction stats */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-4">Mis pronósticos</h2>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-800 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-white">{totalPredicted}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Cargados</p>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-white">{finishedWithPred.length}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Jugados</p>
                  </div>
                  <div className="bg-green-900/40 border border-green-800 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-400">{exactCount}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Marcador exacto ✅</p>
                  </div>
                  <div className="bg-yellow-900/20 border border-yellow-800/50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-400">{winnerCount}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Ganador / empate ⭐</p>
                  </div>
                </div>

                {/* Progress bar */}
                {finishedWithPred.length > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Aciertos</span>
                      <span>{exactCount + winnerCount} de {finishedWithPred.length} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-green-500 to-yellow-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Scoring reference */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-3">Sistema de puntos</h2>
                <div className="space-y-2">
                  {[
                    { label: "Marcador exacto", pts: scoring.exact, color: "text-green-400" },
                    { label: "Ganador correcto", pts: scoring.winner, color: "text-yellow-400" },
                    { label: "Empate correcto", pts: scoring.draw, color: "text-yellow-400" },
                    { label: "Diferencia de goles", pts: scoring.goalDiff, color: "text-blue-400" },
                  ].map(({ label, pts, color }) => (
                    <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-800 last:border-0">
                      <span className="text-sm text-gray-300">{label}</span>
                      <span className={`font-bold text-sm ${color}`}>{pts} pts</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-3">Se aplica solo el puntaje más alto que corresponda.</p>
              </div>

              {/* Partidos sin pronosticar */}
              {totalFinished - finishedWithPred.length > 0 && (
                <div className="bg-red-900/10 border border-red-800/30 rounded-xl p-4 text-center">
                  <p className="text-sm text-red-400">
                    {totalFinished - finishedWithPred.length} partido{totalFinished - finishedWithPred.length !== 1 ? "s" : ""} jugado{totalFinished - finishedWithPred.length !== 1 ? "s" : ""} sin pronóstico
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">No acumulaste puntos en {(totalFinished - finishedWithPred.length) * (scoring.exact)} pts potenciales</p>
                </div>
              )}
            </div>
          );
        })()}

      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800 safe-area-pb">
        <div className="max-w-2xl mx-auto flex">
          {([
            { key: "resultados",  label: "Resultados", icon: "⚽" },
            { key: "pronosticos", label: "Pronóst.",   icon: "📝" },
            { key: "migrupo",     label: "Mi Grupo",   icon: "👥" },
            { key: "posiciones",  label: "Posiciones", icon: "🏆" },
            { key: "miperfil",    label: "Perfil",     icon: "👤" },
          ] as { key: MainTab; label: string; icon: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${tab === t.key ? "text-green-400" : "text-gray-500 hover:text-gray-300"}`}>
              <span className="text-xl leading-none">{t.icon}</span>
              <span className={`text-[11px] font-semibold ${tab === t.key ? "text-green-400" : "text-gray-500"}`}>{t.label}</span>
              {tab === t.key && <span className="absolute bottom-0 w-12 h-0.5 bg-green-500 rounded-full" />}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
