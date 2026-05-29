import { SCORING } from "./types";

export interface ScoringConfig {
  exact: number;
  winner: number;
  draw: number;
  goalDiff: number;
}

export function calculatePoints(
  predHome: number,
  predAway: number,
  realHome: number,
  realAway: number,
  config: ScoringConfig = SCORING
): number {
  if (predHome === realHome && predAway === realAway) return config.exact;

  const predDiff = predHome - predAway;
  const realDiff = realHome - realAway;

  if (realDiff !== 0 && Math.sign(predDiff) === Math.sign(realDiff)) return config.winner;
  if (realDiff === 0 && predDiff === 0) return config.draw;
  if (predDiff === realDiff) return config.goalDiff;

  return 0;
}
