import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { calculatePoints } from "@/lib/scoring";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FLAGS: Record<string, string> = {
  MEX: "🇲🇽", RSA: "🇿🇦", KOR: "🇰🇷", CZE: "🇨🇿",
  CAN: "🇨🇦", BIH: "🇧🇦", QAT: "🇶🇦", SUI: "🇨🇭",
  BRA: "🇧🇷", MAR: "🇲🇦", HAI: "🇭🇹", SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  USA: "🇺🇸", PAR: "🇵🇾", AUS: "🇦🇺", TUR: "🇹🇷",
  GER: "🇩🇪", CUW: "🇨🇼", CIV: "🇨🇮", ECU: "🇪🇨",
  NED: "🇳🇱", JPN: "🇯🇵", SWE: "🇸🇪", TUN: "🇹🇳",
  BEL: "🇧🇪", EGY: "🇪🇬", IRN: "🇮🇷", NZL: "🇳🇿",
  ESP: "🇪🇸", CPV: "🇨🇻", KSA: "🇸🇦", URY: "🇺🇾",
  FRA: "🇫🇷", SEN: "🇸🇳", IRQ: "🇮🇶", NOR: "🇳🇴",
  ARG: "🇦🇷", ALG: "🇩🇿", AUT: "🇦🇹", JOR: "🇯🇴",
  POR: "🇵🇹", COD: "🇨🇩", UZB: "🇺🇿", COL: "🇨🇴",
  ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", CRO: "🇭🇷", GHA: "🇬🇭", PAN: "🇵🇦",
};

const NAMES: Record<string, string> = {
  "United States": "Estados Unidos",
  "South Korea": "Corea del Sur",
  "Bosnia-Herzegovina": "Bosnia",
  "Ivory Coast": "Costa de Marfil",
  "Cape Verde Islands": "Cabo Verde",
  "Congo DR": "Congo RD",
  "New Zealand": "Nueva Zelanda",
  "Saudi Arabia": "Arabia Saudita",
};

const STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: "group",
  LAST_32: "round_of_32",
  LAST_16: "round_of_16",
  QUARTER_FINALS: "quarterfinal",
  SEMI_FINALS: "semifinal",
  THIRD_PLACE: "third_place",
  FINAL: "final",
};

export async function POST(req: NextRequest) {
  try {
    const { adminUid } = await req.json();
    if (adminUid !== process.env.NEXT_PUBLIC_ADMIN_UID) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const apiRes = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
      headers: { "X-Auth-Token": process.env.FOOTBALL_DATA_API_KEY! },
    });
    if (!apiRes.ok) throw new Error(`API error ${apiRes.status}`);
    const { matches } = await apiRes.json();

    let matchNumber = 1;
    const rows = matches.map((m: Record<string, unknown>) => {
      const home = m.homeTeam as Record<string, string>;
      const away = m.awayTeam as Record<string, string>;
      const score = m.score as Record<string, Record<string, number | null>>;
      const homeName = NAMES[home.name] ?? home.name ?? "TBD";
      const awayName = NAMES[away.name] ?? away.name ?? "TBD";
      const finished = m.status === "FINISHED";
      return {
        id: String(m.id),
        home_team: homeName,
        away_team: awayName,
        home_flag: FLAGS[home.tla] ?? null,
        away_flag: FLAGS[away.tla] ?? null,
        stage: STAGE_MAP[m.stage as string] ?? (m.stage as string),
        group_name: m.group ? (m.group as string).replace("GROUP_", "") : null,
        match_number: matchNumber++,
        datetime: m.utcDate as string,
        venue: (m.venue as string) ?? null,
        home_score: finished ? (score.fullTime?.home ?? null) : null,
        away_score: finished ? (score.fullTime?.away ?? null) : null,
        finished,
      };
    });

    // Replace all matches
    await supabaseAdmin.from("matches").delete().neq("id", "___never___");
    await supabaseAdmin.from("matches").insert(rows);

    // Recalculate points for all users
    const finishedMatches = rows.filter((m: typeof rows[0]) => m.finished);
    if (finishedMatches.length > 0) {
      const { data: allUsers } = await supabaseAdmin.from("users").select("uid");
      for (const u of allUsers ?? []) {
        const { data: preds } = await supabaseAdmin.from("predictions").select("*").eq("user_id", u.uid);
        let total = 0;
        for (const p of preds ?? []) {
          const match = finishedMatches.find((m: typeof rows[0]) => m.id === p.match_id);
          if (match && match.home_score !== null && match.away_score !== null) {
            total += calculatePoints(p.home_score, p.away_score, match.home_score, match.away_score);
          }
        }
        await supabaseAdmin.from("users").update({ total_points: total }).eq("uid", u.uid);
      }
    }

    const finished = rows.filter((r: typeof rows[0]) => r.finished).length;
    return NextResponse.json({ synced: rows.length, finished });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
