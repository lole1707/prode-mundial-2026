"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Match, Prediction } from "@/lib/types";
import { calculatePoints, ScoringConfig } from "@/lib/scoring";
import { DEFAULTS } from "@/app/api/config/route";
import { getDisplayName, getPhoto, parseProfile } from "@/lib/profile";
import Navbar from "@/components/Navbar";
import FlagImg from "@/components/FlagImg";
import EditProfileModal from "@/components/EditProfileModal";

type MainTab = "resultados" | "pronosticos" | "posiciones" | "miperfil";

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
      ? <img src={photo} alt={name} className="w-24 h-24 rounded-full object-cover border-4 border-yellow-400 shadow-lg" />
      : <div className="w-24 h-24 rounded-full bg-gray-700 border-4 border-yellow-400 flex items-center justify-center text-3xl font-bold text-gray-300">{name[0]?.toUpperCase() ?? "?"}</div>;
  }
  return photo
    ? <img src={photo} alt={name} className="w-10 h-10 rounded-full object-cover border-2 border-gray-700 flex-shrink-0" />
    : <div className="w-10 h-10 rounded-full bg-gray-700 border-2 border-gray-600 flex items-center justify-center text-sm font-bold text-gray-300 flex-shrink-0">{name[0]?.toUpperCase() ?? "?"}</div>;
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
  const [editingProfile, setEditingProfile] = useState(false);

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

  // Real-time updates: Supabase Realtime + polling every 30s + on tab focus
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

    // Fallback: poll every 30s + refresh on tab focus
    const interval = setInterval(() => refreshMatches(), 30_000);
    const onVisible = () => { if (document.visibilityState === "visible") refreshMatches(); };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      channel?.unsubscribe?.();
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Re-fetch matches+predictions when switching to resultados, pronosticos or miperfil
  useEffect(() => {
    if (!["resultados", "pronosticos", "miperfil"].includes(tab) || !user) return;
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

  const visibleMatches = stage === "group"
    ? matches.filter(m => m.stage === "group" && m.group === group)
    : matches.filter(m => m.stage === stage);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-green-500" /></div>;

  const medals = ["🥇","🥈","🥉"];
  const [lbFirst, ...lbRest] = lbUsers;

  return (
    <div className="min-h-screen pb-20">
      <Navbar />

      <div className="max-w-2xl mx-auto px-4 py-5">

        {/* Stage + Group selectors */}
        {tab !== "posiciones" && (
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
            {visibleMatches.map(m => (
              <div key={m.id} className={`bg-gray-900 border rounded-xl p-4 ${m.finished ? "border-gray-700" : "border-gray-800"}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-gray-500">{stage === "group" ? `Grupo ${m.group} · ` : ""}{new Date(m.datetime).toLocaleDateString("es-AR", { weekday:"short", day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}</span>
                  {m.finished ? <span className="text-xs text-green-500 font-semibold">Finalizado</span> : <span className="text-xs text-gray-500">{m.venue}</span>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex flex-col items-end gap-1">
                    <FlagImg flag={m.homeFlag} size={28} />
                    <p className="text-sm font-semibold text-white text-right">{m.homeTeam}</p>
                  </div>
                  <div className="text-center min-w-[60px]">
                    {m.finished
                      ? <div className="text-2xl font-bold text-white">{m.homeScore} - {m.awayScore}</div>
                      : <div className="text-sm text-gray-600 font-bold">vs</div>}
                  </div>
                  <div className="flex-1 flex flex-col items-start gap-1">
                    <FlagImg flag={m.awayFlag} size={28} />
                    <p className="text-sm font-semibold text-white">{m.awayTeam}</p>
                  </div>
                </div>
              </div>
            ))}
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
              const cutoff = new Date(new Date(m.datetime).getTime() - 30 * 60 * 1000);
              const deleteCutoff = new Date(new Date(m.datetime).getTime() - 20 * 60 * 1000);
              const isPast = cutoff < new Date();
              const canPredict = !isPast && !isFinished;
              const canDelete = deleteCutoff > new Date() && !isFinished;
              const pts = isFinished && pred ? calculatePoints(pred.homeScore, pred.awayScore, m.homeScore!, m.awayScore!, scoring) : null;
              const homeVal = draft?.home ?? (pred ? String(pred.homeScore) : "");
              const awayVal = draft?.away ?? (pred ? String(pred.awayScore) : "");
              return (
                <div key={m.id} className={`bg-gray-900 border rounded-xl p-4 ${isFinished ? "border-gray-700" : "border-gray-800"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500">{new Date(m.datetime).toLocaleDateString("es-AR", { weekday:"short", day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}</span>
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
                      {/* Delete prediction — only until 20 min before kickoff */}
                      {canDelete && predictions[m.id] && !drafts[m.id] && (
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

        {/* POSICIONES */}
        {tab === "posiciones" && (
          <div>
            {!lbLoaded ? (
              <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-green-500" /></div>
            ) : lbUsers.length === 0 ? (
              <p className="text-gray-500 text-center py-12">Aún no hay participantes.</p>
            ) : (
              <>
                {/* 1st place hero */}
                {lbFirst && (() => {
                  const name = getDisplayName(lbFirst.display_name);
                  const photo = getPhoto(lbFirst.display_name);
                  return (
                    <div className={`flex flex-col items-center bg-gray-900 border-2 rounded-2xl px-6 py-8 mb-5 ${lbFirst.uid === user?.uid ? "border-green-600" : "border-yellow-500/60"}`}>
                      <span className="text-4xl mb-3">🥇</span>
                      <Avatar photo={photo} name={name} size="lg" />
                      <p className="mt-4 text-xl font-bold text-white">
                        {name} {lbFirst.uid === user?.uid && <span className="text-sm text-green-400">(vos)</span>}
                      </p>
                      <p className="text-4xl font-bold text-green-400 mt-2">{lbFirst.total_points}</p>
                      <p className="text-sm text-gray-500">pts</p>
                    </div>
                  );
                })()}

                {/* Rest */}
                <div className="space-y-2">
                  {lbRest.map((u, i) => {
                    const name = getDisplayName(u.display_name);
                    const photo = getPhoto(u.display_name);
                    const pos = i + 2;
                    const isMe = u.uid === user?.uid;
                    return (
                      <div key={u.uid} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${isMe ? "bg-green-950/30 border-green-700" : "bg-gray-900 border-gray-800"}`}>
                        <span className="w-8 text-center flex-shrink-0">
                          {pos === 2 ? <span className="text-xl">🥈</span>
                            : pos === 3 ? <span className="text-xl">🥉</span>
                            : <span className="text-gray-500 text-sm font-medium">#{pos}</span>}
                        </span>
                        <Avatar photo={photo} name={name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white truncate">
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
              </>
            )}
          </div>
        )}
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
                  ? <img src={photo} alt={apodo} className="w-20 h-20 rounded-full object-cover border-2 border-green-600 flex-shrink-0" />
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
            { key: "resultados",  label: "Resultados",  icon: "⚽" },
            { key: "pronosticos", label: "Pronósticos",  icon: "📝" },
            { key: "posiciones",  label: "Posiciones",   icon: "🏆" },
            { key: "miperfil",    label: "Mi Perfil",    icon: "👤" },
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
