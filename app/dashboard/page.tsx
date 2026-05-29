"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Match, Prediction } from "@/lib/types";
import { calculatePoints, ScoringConfig } from "@/lib/scoring";
import { DEFAULTS } from "@/app/api/config/route";
import { getDisplayName, getPhoto } from "@/lib/profile";
import Navbar from "@/components/Navbar";
import FlagImg from "@/components/FlagImg";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

type MainTab = "resultados" | "pronosticos" | "posiciones";

const STAGES = [
  { key: "group", label: "Grupos" },
  { key: "round_of_32", label: "32avos" },
  { key: "round_of_16", label: "16avos" },
  { key: "quarterfinal", label: "Cuartos" },
  { key: "semifinal", label: "Semis" },
  { key: "third_place", label: "3° Puesto" },
  { key: "final", label: "Final" },
];
const GROUPS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

interface LeaderboardUser { uid: string; display_name: string; total_points: number; }

export default function Dashboard() {
  const { user, loading, isAdmin } = useAuth();
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

  useEffect(() => {
    if (!loading && !user) router.push("/");
    if (!loading && user && !user.profileCompleted && !isAdmin) router.push("/profile");
  }, [user, loading, router]);

  useEffect(() => {
    async function load() {
      const [cfgRes, matchRes] = await Promise.all([
        fetch("/api/config"),
        fetch("/api/matches"),
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
    if (user) load();
  }, [user]);

  useEffect(() => {
    if (tab === "posiciones" && !lbLoaded) {
      fetch(`${SUPABASE_URL}/rest/v1/users?uid=neq.__scoring_config__&select=uid,display_name,total_points&order=total_points.desc`, {
        headers: { "apikey": SUPABASE_KEY },
      }).then(r => r.json()).then(data => { setLbUsers(data ?? []); setLbLoaded(true); });
    }
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

  const visibleMatches = stage === "group"
    ? matches.filter(m => m.stage === "group" && m.group === group)
    : matches.filter(m => m.stage === stage);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-green-500" /></div>;

  const medals = ["🥇","🥈","🥉"];

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Tab bar */}
      <div className="border-b border-gray-800 bg-gray-950 sticky top-14 z-40">
        <div className="max-w-2xl mx-auto flex">
          {([
            { key: "resultados", label: "Resultados" },
            { key: "pronosticos", label: "Mis pronósticos" },
            { key: "posiciones", label: "Posiciones" },
          ] as { key: MainTab; label: string }[]).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-3.5 text-sm font-semibold border-b-2 transition-colors ${tab === t.key ? "border-green-500 text-green-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">

        {/* Stage + Group selectors (for resultados and pronosticos) */}
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
                  {m.finished
                    ? <span className="text-xs text-green-500 font-semibold">Finalizado</span>
                    : <span className="text-xs text-gray-500">{m.venue}</span>
                  }
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex flex-col items-end gap-1">
                    <FlagImg flag={m.homeFlag} size={28} />
                    <p className="text-sm font-semibold text-white text-right">{m.homeTeam}</p>
                  </div>
                  <div className="text-center min-w-[60px]">
                    {m.finished
                      ? <div className="text-2xl font-bold text-white">{m.homeScore} - {m.awayScore}</div>
                      : <div className="text-sm text-gray-600 font-bold">vs</div>
                    }
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
              const isPast = new Date(m.datetime) < new Date();
              const canPredict = !isPast && !isFinished;
              const pts = isFinished && pred ? calculatePoints(pred.homeScore, pred.awayScore, m.homeScore!, m.awayScore!, scoring) : null;
              const homeVal = draft?.home ?? (pred ? String(pred.homeScore) : "");
              const awayVal = draft?.away ?? (pred ? String(pred.awayScore) : "");

              return (
                <div key={m.id} className={`bg-gray-900 border rounded-xl p-4 ${isFinished ? "border-gray-700" : "border-gray-800"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-500">{new Date(m.datetime).toLocaleDateString("es-AR", { weekday:"short", day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" })}</span>
                    {isFinished && pred && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pts! > 0 ? "bg-green-900/50 text-green-400" : "bg-gray-800 text-gray-500"}`}>
                        {pts} pts
                      </span>
                    )}
                    {isPast && !isFinished && !pred && <span className="text-xs text-red-500">Sin pronóstico</span>}
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
                        pred ? <div className="text-sm text-gray-400 font-semibold">{pred.homeScore} - {pred.awayScore}</div>
                             : <div className="text-xs text-gray-600">—</div>
                      )}
                      {isFinished && pred && (
                        <div className="text-xs text-gray-500">Pronóstico: {pred.homeScore}-{pred.awayScore}</div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col items-start gap-1">
                      <FlagImg flag={m.awayFlag} size={28} />
                      <p className="text-sm font-semibold text-white">{m.awayTeam}</p>
                    </div>
                  </div>
                  {canPredict && drafts[m.id] && (
                    <div className="mt-3 flex justify-end">
                      <button onClick={() => savePrediction(m.id)} disabled={saving === m.id}
                        className="text-xs bg-green-600 hover:bg-green-500 disabled:opacity-50 px-4 py-1.5 rounded-lg font-semibold transition-colors">
                        {saving === m.id ? "..." : "Guardar"}
                      </button>
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
              <p className="text-gray-500 text-center py-12">Aún no hay posiciones.</p>
            ) : (
              <div className="space-y-2">
                {lbUsers.map((u, i) => {
                  const name = getDisplayName(u.display_name);
                  const photo = getPhoto(u.display_name);
                  const isMe = u.uid === user?.uid;
                  return (
                    <div key={u.uid} className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${isMe ? "bg-green-950/30 border-green-700" : "bg-gray-900 border-gray-800"}`}>
                      <div className="w-8 text-center flex-shrink-0">
                        {i < 3
                          ? <span className="text-xl">{medals[i]}</span>
                          : <span className="text-gray-500 text-sm font-bold">#{i+1}</span>
                        }
                      </div>
                      {photo ? (
                        <img src={photo} alt={name} className="w-10 h-10 rounded-full object-cover border border-gray-700 flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-base font-bold text-gray-300 flex-shrink-0">
                          {name[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-white">{name}</p>
                          {isMe && <span className="text-xs text-green-400 font-medium">(vos)</span>}
                        </div>
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
        )}
      </div>
    </div>
  );
}
