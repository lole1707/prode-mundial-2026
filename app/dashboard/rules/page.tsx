"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";

export default function RulesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push("/");
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8">

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Reglas del Juego</h1>
          <p className="text-gray-400 text-sm">Sistema de puntuación y reglas del Prode Mundial 2026</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { label: "Grupos", value: "216 pts", sub: "72 partidos" },
            { label: "Eliminatorias", value: "146 pts", sub: "32 equipos" },
            { label: "Total máx.", value: "362 pts", sub: "Puntaje máximo" },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">{label}</p>
              <p className="text-xl font-bold text-green-400">{value}</p>
              <p className="text-xs text-gray-600 mt-1">{sub}</p>
            </div>
          ))}
        </div>

        {/* Fase de Grupos */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Fase de Grupos</h2>
              <p className="text-xs text-gray-500">72 partidos · Por partido</p>
            </div>
            <span className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full">72 partidos</span>
          </div>

          <div className="space-y-2 mb-5">
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="text-gray-300">Resultado correcto</span>
              <span className="font-bold text-white">2 pts</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-800">
              <span className="text-gray-300">+ Marcador exacto</span>
              <span className="font-bold text-green-400">+1 pt</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-400 font-medium">Máximo por partido</span>
              <span className="font-bold text-white">3 pts</span>
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Ejemplos</p>
            <div className="space-y-2">
              {[
                { pred: "2-0 → 2-0", pts: "3 pts", color: "text-green-400", desc: "Exacto" },
                { pred: "1-0 → 2-0", pts: "2 pts", color: "text-yellow-400", desc: "Ganador correcto" },
                { pred: "X → 2-0", pts: "0 pts", color: "text-gray-500", desc: "Sin puntos" },
              ].map(({ pred, pts, color, desc }) => (
                <div key={pred} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-2.5">
                  <div>
                    <span className="text-white font-mono text-sm">{pred}</span>
                    <span className="text-gray-500 text-xs ml-2">{desc}</span>
                  </div>
                  <span className={`font-bold text-sm ${color}`}>{pts}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-800 flex justify-between">
            <span className="text-gray-400">Máximo grupos</span>
            <span className="font-bold text-white">216 pts</span>
          </div>
        </div>

        {/* Fase Eliminatoria */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-white">Fase Eliminatoria</h2>
              <p className="text-xs text-gray-500">Puntos por clasificar</p>
            </div>
          </div>

          <div className="space-y-2 mb-5">
            {[
              { stage: "16avos de final", pts: "1 pt c/u" },
              { stage: "Octavos de final", pts: "2 pts c/u" },
              { stage: "Cuartos de final", pts: "4 pts c/u" },
              { stage: "Semifinales", pts: "6 pts c/u" },
              { stage: "Final", pts: "8 pts c/u" },
              { stage: "Campeón del mundo", pts: "10 pts", highlight: true },
            ].map(({ stage, pts, highlight }) => (
              <div key={stage} className={`flex justify-between items-center py-2 border-b border-gray-800 last:border-0 ${highlight ? "pt-3" : ""}`}>
                <span className={highlight ? "text-yellow-400 font-semibold" : "text-gray-300"}>{stage}</span>
                <span className={`font-bold ${highlight ? "text-yellow-400" : "text-white"}`}>{pts}</span>
              </div>
            ))}
          </div>

          <div className="bg-green-900/20 border border-green-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-300">
              Si acertás al campeón, acumulás el camino completo:{" "}
              <span className="font-mono font-bold">1+2+4+6+8+10 = 31 pts.</span>
            </p>
          </div>

          <div className="pt-2 border-t border-gray-800 flex justify-between">
            <span className="text-gray-400">Máximo eliminatorias</span>
            <span className="font-bold text-white">146 pts</span>
          </div>
        </div>

        {/* Reglas y Consejos */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-4">
          <h2 className="text-lg font-bold text-white mb-4">Reglas y consejos</h2>

          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Reglas importantes</p>
          <div className="space-y-3 mb-6">
            {[
              { icon: "🔒", text: "Cierre: 11/06/2026 00:00 AR. Sin cambios tras el cierre." },
              { icon: "⚪", text: "Sin predicción: 0 pts, sin penalización adicional." },
              { icon: "⚽", text: "Eliminatorias: Solo importa quién clasifica. Penales = clasificado." },
              { icon: "🥉", text: "3er puesto: El partido por tercer lugar no otorga puntos." },
            ].map(({ icon, text }) => (
              <div key={text} className="flex gap-3 items-start">
                <span className="text-lg flex-shrink-0">{icon}</span>
                <p className="text-gray-300 text-sm">{text}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Consejos para ganar</p>
          <div className="space-y-3">
            {[
              { icon: "🎲", text: 'Usá "Llenar Aleatorio" para completar un grupo rápido y ajustar.' },
              { icon: "⚡", text: "Completá temprano para no perder partidos por el cierre." },
              { icon: "🏆", text: "No descuides las eliminatorias — valen el 40% del total." },
              { icon: "📊", text: "Revisá el Ranking regularmente para ver cómo vas." },
            ].map(({ icon, text }) => (
              <div key={text} className="flex gap-3 items-start">
                <span className="text-lg flex-shrink-0">{icon}</span>
                <p className="text-gray-300 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="bg-green-900/20 border border-green-700 rounded-xl p-5 text-center">
          <p className="text-gray-400 text-sm mb-1">Puntaje máximo total</p>
          <p className="text-4xl font-bold text-green-400">362 pts</p>
        </div>

      </div>
    </div>
  );
}
