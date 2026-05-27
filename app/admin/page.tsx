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

type Tab = "fixture" | "users";

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("fixture");

  // Fixture state
  const [matches, setMatches] = useState<Match[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { home: string; away: string }>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [activeStage, setActiveStage] = useState("group");

  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");

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
    async function loadUsers() {
      const snap = await getDocs(collection(db, "users"));
      setUsers(snap.docs.map((d) => d.data() as UserProfile));
    }
    if (isAdmin) { load(); loadUsers(); }
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
    setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, homeScore: home, awayScore: away, finished: true } : m));
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
        if (match) total += calculatePoints(pred.homeScore, pred.awayScore, match.homeScore!, match.awayScore!);
      });
      await setDoc(doc(db, "users", u.uid), { ...u, totalPoints: total });
    }
    setRecalculating(false);
    alert("Puntajes recalculados.");
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreateSuccess("");
    setCreating(true);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: newName,
          username: newEmail,
          password: newPassword,
          adminUid: user?.uid,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCreateSuccess(`Usuario "${newName}" creado. Login: ${newEmail} / ${newPassword}`);
      setNewName(""); setNewEmail(""); setNewPassword("");
      setUsers((prev) => [...prev, { uid: data.uid, displayName: newName, email: `${newEmail}@prode.app`, totalPoints: 0 }]);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : "Error al crear usuario");
    } finally {
      setCreating(false);
    }
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
        <h1 className="text-2xl font-bold mb-6">Panel de Admin</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-gray-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => setTab("fixture")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "fixture" ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Fixture y Resultados
          </button>
          <button
            onClick={() => setTab("users")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "users" ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Usuarios
          </button>
        </div>

        {/* USUARIOS TAB */}
        {tab === "users" && (
          <div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">Crear nuevo usuario</h2>
              <form onSubmit={createUser} className="space-y-3">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  placeholder="Nombre o apodo"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
                <input
                  type="text"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  placeholder="Usuario (ej: pedro)"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Contraseña (mín. 6 caracteres)"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
                {createError && <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{createError}</p>}
                {createSuccess && <p className="text-green-400 text-sm bg-green-900/20 border border-green-800 rounded-lg px-3 py-2">{createSuccess}</p>}
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
                >
                  {creating ? "Creando..." : "Crear usuario"}
                </button>
              </form>
            </div>

            <h2 className="text-lg font-semibold mb-3">Participantes ({users.length})</h2>
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.uid} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                  <div>
                    <p className="font-medium">{u.displayName}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                  <span className="text-green-400 font-bold">{u.totalPoints} pts</span>
                </div>
              ))}
              {users.length === 0 && <p className="text-gray-500 text-sm">No hay usuarios aún.</p>}
            </div>
          </div>
        )}

        {/* FIXTURE TAB */}
        {tab === "fixture" && (
          <>
            <div className="flex gap-2 mb-6">
              <button onClick={seedFixture} disabled={seeding} className="text-sm bg-blue-700 hover:bg-blue-600 disabled:opacity-50 px-3 py-2 rounded-lg transition-colors">
                {seeding ? "Cargando..." : "Cargar Fixture"}
              </button>
              <button onClick={recalculateAll} disabled={recalculating} className="text-sm bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 px-3 py-2 rounded-lg transition-colors">
                {recalculating ? "Calculando..." : "Recalcular Puntajes"}
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {stages.map((s) => (
                <button key={s.key} onClick={() => setActiveStage(s.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeStage === s.key ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
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
                      <div className="flex-1 text-right">{match.homeFlag} {match.homeTeam}</div>
                      <div className="flex items-center gap-1">
                        <input type="number" min={0} max={99} value={homeVal}
                          onChange={(e) => setDrafts((p) => ({ ...p, [match.id]: { home: e.target.value, away: p[match.id]?.away ?? awayVal } }))}
                          className="w-12 text-center bg-gray-800 border border-gray-700 rounded-lg py-2 text-white font-bold text-lg focus:outline-none focus:border-green-500" />
                        <span className="text-gray-500">-</span>
                        <input type="number" min={0} max={99} value={awayVal}
                          onChange={(e) => setDrafts((p) => ({ ...p, [match.id]: { home: p[match.id]?.home ?? homeVal, away: e.target.value } }))}
                          className="w-12 text-center bg-gray-800 border border-gray-700 rounded-lg py-2 text-white font-bold text-lg focus:outline-none focus:border-green-500" />
                      </div>
                      <div className="flex-1">{match.awayTeam} {match.awayFlag}</div>
                      <button onClick={() => saveResult(match.id)} disabled={saving === match.id || !drafts[match.id]}
                        className="text-sm bg-green-700 hover:bg-green-600 disabled:opacity-40 px-3 py-2 rounded-lg transition-colors">
                        {saving === match.id ? "..." : "Guardar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
