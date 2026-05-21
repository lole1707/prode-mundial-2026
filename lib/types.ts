export type Stage =
  | "group"
  | "round_of_32"
  | "round_of_16"
  | "quarterfinal"
  | "semifinal"
  | "third_place"
  | "final";

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string;
  awayFlag: string;
  stage: Stage;
  group?: string;
  matchNumber: number;
  datetime: string; // ISO string
  venue: string;
  homeScore: number | null;
  awayScore: number | null;
  finished: boolean;
}

export interface Prediction {
  id?: string;
  userId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  totalPoints: number;
  photoURL?: string;
}

export interface PointsBreakdown {
  exact: number;        // resultado exacto: 4 pts
  winner: number;       // ganador correcto: 3 pts
  draw: number;         // empate correcto: 3 pts
  goalDiff: number;     // diferencia correcta: 1 pt
  total: number;
}

export const SCORING = {
  exact: 4,
  winner: 3,
  draw: 3,
  goalDiff: 1,
} as const;
