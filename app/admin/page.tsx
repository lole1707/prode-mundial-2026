"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, doc, setDoc, writeBatch, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Match, UserProfile } from "@/lib/types";
import { FIXTURE } from "@/lib/fixture";
import { calculatePoints } from "@/lib/scoring";
import Navbar from "@/components/Navbar";

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { home: string; away: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [activeStage, setActiveStage] = useState("group");

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.push("/dashboard");
  }, [user, isAdmin, loading, router]);

  useEffect(() => {
    async function load() {
      const snap = await getDocs(collection(db, "matches"));
      if (snap.empty) {
        setMatches(FIXTURE.map((m) => ({ ...m, homeScore: null, awayScore: null, finished: false })));
      } else {
        setMatches(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Match)));
      }
    }
    if (isAdmin) load();
  }, [isAdmin]);

  async function seedFixture() {
    setSeeding(true);
    const batch = writeBatch(db);
    for (const m of FIXTURE) {
      batch.set(doc(db, "matches", m.id), { ...m, homeScore: null, awayScore: null, finished: false });
    }
    await batch.commit();
    setMatches(FIXTURE.map((m) => ({ ...m, homeScore: null, awayScore: null, finished: false })));
    setSeeding(false);
  }

  async function saveResult(matchId: string) {
    const draft = drafts[matchId];
    if (!draft) return;
    const home = parseInt(draft.home);
    const away = parseInt(draft.away);
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) return;

    setSaving(matchId);
    await setDoc(doc(db, "matches", matchId), {
      ...matches.find((m) => m.id === matchId)!,
      homeScore: home,
      awayScore: away,
      finished: true,
    });
    setMatches((prev) =>
      prev.map((m) => m.id === matchId ? { ...m, homeScore: home, awayScore: away, finished: true } : m)
    );
    setDrafts((prev) => { const n = { ...prev }; delete n[matchId]; return n; });
    setSaving(null);
  }

  async function recalculateAll() {
    setRecalculating(true);
    const finishedMatches = matches.filter((m) => m.finished && m.homeScore !== null && m.awayScore !== null);
    const usersSnap = await getDocs(collection(db, "users"));
    const allUsers = usersSnap.docs.map((d) => d.data() as UserProfile);

    for (const u of allUsers) {
      const predSnap = await getDocs(query(collection(db, "predictions"), where("userId", "==", u.uid)));
      let total = 0;
      predSnap.forEach((d) => {
        const pred = d.data();
        const match = finishedMatches.find((m) => m.id === pred.matchId);
        if (match) {
          total += calculatePoints(pred.homeScore, pred.awayScore, match.homeScore!, match.awayScore!);
        }
      });
      await setDoc(doc(db, "users", u.uid), { ...u, totalPoints: total });
    }
    setRecalculating(false);
    alert("Puntajes recalculados correctamente.");
  }

  const stages = [
    { key: "group", label: "Grupos" },
    { key: "round_of_32", label: "32avos" },
    { key: "round_of_16", label: "16avos" },
    { key: "quarterfinal", label: "Cuartos" },
    { key: "semifinal", label: "Semis" },
    { key: "third_place", label: "3° Puesto" },
    { key: "final", label: "Final" },
  ];

  const visibleMatches = matches.filter((m) => m.stage === activeStage);

  if (loading) return null;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Panel de Admin</h1>
          <div className="flex gap-2">
            <button
              onClick={seedFixture}
              disabled={seeding}
              className="text-sm bg-blue-700 hover:bg-blue-600 disabled:opacity-50 px-3 py-2 rounded-lg transition-colors"
            >
              {seeding ? "Cargando..." : "Cargar Fixture"}
            </button>
            <button
              onClick={recalculateAll}
              disabled={recalculating}
              className="text-sm bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 px-3 py-2 rounded-lg transition-colors"
            >
              {recalculating ? "Calculando..." : "Recalcular Puntajes"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {stages.map((s) => (
            <button
              key={s.key}
              onClick={() => setActiveStage(s.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeStage === s.key ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {visibleMatches.map((match) => {
            const draft = drafts[match.id];
            const homeVal = draft?.home ?? (match.homeScore !== null ? String(match.homeScore) : "");
            const awayVal = draft?.away ?? (match.awayScore !== null ? String(match.awayScore) : "");

            return (
              <div key={match.id} className={`bg-gray-900 border rounded-xl p-4 ${match.finished ? "border-green-900" : "border-gray-800"}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">
                    {match.stage === "group" && `Grupo ${match.group} · `}
                    {new Date(match.datetime).toLocaleDateString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {match.finished && <span className="text-xs text-green-500 font-semibold">Finalizado</span>}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 text-right">
                    <span>{match.homeFlag} {match.homeTeam}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={homeVal}
                      onChange={(e) => setDrafts((p) => ({ ...p, [match.id]: { home: e.target.value, away: p[match.id]?.away ?? awayVal } }))}
                      className="w-12 text-center bg-gray-800 border border-gray-700 rounded-lg py-2 text-white font-bold text-lg focus:outline-none focus:border-green-500"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={awayVal}
                      onChange={(e) => setDrafts((p) => ({ ...p, [match.id]: { home: p[match.id]?.home ?? homeVal, away: e.target.value } }))}
                      className="w-12 text-center bg-gray-800 border border-gray-700 rounded-lg py-2 text-white font-bold text-lg focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div className="flex-1">
                    <span>{match.awayTeam} {match.awayFlag}</span>
                  </div>
                  <button
                    onClick={() => saveResult(match.id)}
                    disabled={saving === match.id || !drafts[match.id]}
                    className="text-sm bg-green-700 hover:bg-green-600 disabled:opacity-40 px-3 py-2 rounded-lg transition-colors whitespace-nowrap"
                  >
                    {saving === match.id ? "..." : "Guardar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
