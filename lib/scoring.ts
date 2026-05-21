import { SCORING } from "./types";

export function calculatePoints(
  predHome: number,
  predAway: number,
  realHome: number,
  realAway: number
): number {
  // Resultado exacto
  if (predHome === realHome && predAway === realAway) return SCORING.exact;

  const predDiff = predHome - predAway;
  const realDiff = realHome - realAway;

  // Ganador correcto (no exacto)
  if (realDiff !== 0 && Math.sign(predDiff) === Math.sign(realDiff)) return SCORING.winner;

  // Empate correcto (no exacto)
  if (realDiff === 0 && predDiff === 0) return SCORING.draw;

  // Diferencia de goles correcta
  if (predDiff === realDiff) return SCORING.goalDiff;

  return 0;
}
