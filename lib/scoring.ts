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
  // Exact score (includes exact draw like 1-1 vs 1-1)
  if (predHome === realHome && predAway === realAway) return config.exact;

  const predDiff = predHome - predAway;
  const realDiff = realHome - realAway;

  // Correct winner (non-draw): base points + bonus if same goal difference
  if (realDiff !== 0 && Math.sign(predDiff) === Math.sign(realDiff)) {
    return config.winner + (predDiff === realDiff ? config.goalDiff : 0);
  }

  // Correct draw (e.g. predicted 0-0, ended 1-1)
  if (realDiff === 0 && predDiff === 0) return config.draw;

  return 0;
}
