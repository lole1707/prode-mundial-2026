"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Match, Prediction } from "@/lib/types";
import { FIXTURE } from "@/lib/fixture";
import { calculatePoints } from "@/lib/scoring";
import Navbar from "@/components/Navbar";
import FlagImg from "@/components/FlagImg";

const STAGE_LABELS: Record<string, string> = {
  group: "Fase de Grupos",
  round_of_32: "Octavos de Final",
  round_of_16: "Dieciseisavos",
  quarterfinal: "Cuartos de Final",
  semifinal: "Semifinal",
  third_place: "Tercer Puesto",
  final: "Final",
};

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({});
  const [drafts, setDrafts] = useState<Record<string, { home: string; away: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [activeGroup, setActiveGroup] = useState("A");

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    async function load() {
      const { data: matchData } = await supabase.from("matches").select("*").order("match_number");
      if (matchData && matchData.length > 0) {
        setMatches(matchData.map(m => ({
          id: m.id, homeTeam: m.home_team, awayTeam: m.away_team,
          homeFlag: m.home_flag, awayFlag: m.away_flag, stage: m.stage,
          group: m.group_name, matchNumber: m.match_number, datetime: m.datetime,
          venue: m.venue, homeScore: m.home_score, awayScore: m.away_score, finished: m.finished,
        })));
      } else {
        setMatches(FIXTURE.map(m => ({ ...m, homeScore: null, awayScore: null, finished: false })));
      }

      if (user) {
        const { data: predData } = await supabase.from("predictions").select("*").eq("user_id", user.uid);
        const map: Record<string, Prediction> = {};
        predData?.forEach(p => {
          map[p.match_id] = { id: p.id, userId: p.user_id, matchId: p.match_id, homeScore: p.home_score, awayScore: p.away_score, createdAt: p.created_at, updatedAt: p.updated_at };
        });
        setPredictions(map);
      }
    }
    if (user) load();
  }, [user]);

  const groups = ["A","B","C","D","E","F","G","H","I","J","K","L"];
  const groupMatches = matches.filter(m => m.stage === "group" && m.group === activeGroup);
  const knockoutMatches = matches.filter(m => m.stage !== "group");

  async function savePrediction(matchId: string) {
    if (!user) return;
    const draft = drafts[matchId];
    if (!draft) return;
    const home = parseInt(draft.home);
    const away = parseInt(draft.away);
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) return;

    setSaving(matchId);
    const now = new Date().toISOString();
    const { data } = await supabase.from("predictions").upsert({
      user_id: user.uid,
      match_id: matchId,
      home_score: home,
      away_score: away,
      updated_at: now,
      created_at: predictions[matchId]?.createdAt ?? now,
    }, { onConflict: "user_id,match_id" }).select().single();

    setPredictions(prev => ({
      ...prev,
      [matchId]: { id: data?.id, userId: user.uid, matchId, homeScore: home, awayScore: away, createdAt: predictions[matchId]?.createdAt ?? now, updatedAt: now },
    }));
    setDrafts(prev => { const n = { ...prev }; delete n[matchId]; return n; });
    setSaving(null);
  }

  function MatchCard({ match }: { match: Match }) {
    const pred = predictions[match.id];
    const draft = drafts[match.id];
    const isFinished = match.finished && match.homeScore !== null && match.awayScore !== null;
    const pts = isFinished && pred ? calculatePoints(pred.homeScore, pred.awayScore, match.homeScore!, match.awayScore!) : null;
    const isPast = new Date(match.datetime) < new Date();
    const canPredict = !isPast && !isFinished;
    const homeVal = draft?.home ?? (pred ? String(pred.homeScore) : "");
    const awayVal = draft?.away ?? (pred ? String(pred.awayScore) : "");

    return (
      <div className={`bg-gray-900 border rounded-xl p-4 ${isFinished ? "border-gray-700" : "border-gray-800"}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-gray-500">{new Date(match.datetime).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          <span className="text-xs text-gray-500">{match.venue}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 text-right flex flex-col items-end gap-1">
            <FlagImg flag={match.homeFlag} size={28} />
            <p className="text-sm font-medium text-white">{match.homeTeam}</p>
          </div>
          <div className="flex items-center gap-2">
            {isFinished ? (
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{match.homeScore} - {match.awayScore}</div>
                <div className="text-xs text-gray-500 mt-1">Final</div>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <input type="number" min={0} max={99} value={homeVal}
                  onChange={e => setDrafts(p => ({ ...p, [match.id]: { home: e.target.value, away: p[match.id]?.away ?? awayVal } }))}
                  disabled={!canPredict}
                  className="w-12 text-center bg-gray-800 border border-gray-700 rounded-lg py-2 text-white font-bold text-lg focus:outline-none focus:border-green-500 disabled:opacity-40" />
                <span className="text-gray-500 font-bold">-</span>
                <input type="number" min={0} max={99} value={awayVal}
                  onChange={e => setDrafts(p => ({ ...p, [match.id]: { home: p[match.id]?.home ?? homeVal, away: e.target.value } }))}
                  disabled={!canPredict}
                  className="w-12 text-center bg-gray-800 border border-gray-700 rounded-lg py-2 text-white font-bold text-lg focus:outline-none focus:border-green-500 disabled:opacity-40" />
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col items-start gap-1">
            <FlagImg flag={match.awayFlag} size={28} />
            <p className="text-sm font-medium text-white">{match.awayTeam}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div>
            {pred && !isFinished && <span className="text-xs text-gray-500">Pronóstico: {pred.homeScore}-{pred.awayScore}</span>}
            {isFinished && pred && (
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${pts! > 0 ? "bg-green-900/40 text-green-400" : "bg-gray-800 text-gray-500"}`}>{pts} pts</span>
            )}
          </div>
          {canPredict && drafts[match.id] && (
            <button onClick={() => savePrediction(match.id)} disabled={saving === match.id}
              className="text-xs bg-green-600 hover:bg-green-500 disabled:opacity-50 px-3 py-1.5 rounded-lg font-medium transition-colors">
              {saving === match.id ? "..." : "Guardar"}
            </button>
          )}
          {isPast && !isFinished && !pred && <span className="text-xs text-red-500">Sin pronóstico</span>}
        </div>
      </div>
    );
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-green-500" /></div>;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h2 className="text-xl font-bold mb-4">Fase de Grupos</h2>
        <div className="flex flex-wrap gap-2 mb-6">
          {groups.map(g => (
            <button key={g} onClick={() => setActiveGroup(g)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeGroup === g ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
              Grupo {g}
            </button>
          ))}
        </div>
        <div className="space-y-3 mb-8">
          {groupMatches.map(m => <MatchCard key={m.id} match={m} />)}
        </div>
        {knockoutMatches.length > 0 && (
          <>
            <h2 className="text-xl font-bold mb-4">Eliminatorias</h2>
            {(["round_of_32","round_of_16","quarterfinal","semifinal","third_place","final"] as const).map(stage => {
              const ms = knockoutMatches.filter(m => m.stage === stage);
              if (!ms.length) return null;
              return (
                <div key={stage} className="mb-6">
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{STAGE_LABELS[stage]}</h3>
                  <div className="space-y-3">{ms.map(m => <MatchCard key={m.id} match={m} />)}</div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
