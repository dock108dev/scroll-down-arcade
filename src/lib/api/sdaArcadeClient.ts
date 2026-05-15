/**
 * Browser-side client for the arcade BFF proxy.
 *
 * The arcade UI never talks to SDA directly — every request goes through the
 * same-origin `/api/pressure/*` Next.js route handlers so the API key stays
 * server-side. This client wraps those routes with typed responses and a
 * distinct "no pack today" return path so the UI can render an off-day state
 * without treating it as an error.
 */

import type {
  ArcadeDailyPressurePack,
  ArcadeMoment,
  ArcadePitcherGameplay,
  ArcadeRunners,
  Handedness,
  InningHalf,
  PressureTier,
} from "@/lib/api/types";

const TODAY_PATH = "/api/pressure/today";
const DAILY_PATH_PREFIX = "/api/pressure/daily/";

/**
 * Error thrown by the arcade client for transport or upstream failures.
 * 404 is *not* an error path — it surfaces as `{ ok: false, reason: 'no_pack' }`.
 */
export class ArcadeApiError extends Error {
  readonly status: number;
  readonly detail: string | null;

  constructor(message: string, status: number, detail: string | null) {
    super(message);
    this.name = "ArcadeApiError";
    this.status = status;
    this.detail = detail;
  }
}

/**
 * Discriminated response for a pressure-pack fetch.
 *  - `ok: true`  — pack body parsed and returned.
 *  - `ok: false` with `reason: 'no_pack'` — SDA reported no pack for the
 *    requested date. Carries the date and detail from the upstream body so
 *    the UI can show "no games on YYYY-MM-DD" without a second request.
 */
export type PressurePackResponse =
  | { ok: true; pack: ArcadeDailyPressurePack }
  | { ok: false; reason: "no_pack"; date: string; detail: string };

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function asTier(value: unknown): PressureTier {
  return value === "low" ||
    value === "medium" ||
    value === "high" ||
    value === "extreme"
    ? value
    : "medium";
}

function asHalf(value: unknown): InningHalf {
  return value === "bottom" ? "bottom" : "top";
}

function clampInt(value: unknown, min: number, max: number): number {
  const number = Math.trunc(asNumber(value, min));
  return Math.min(max, Math.max(min, number));
}

function playerId(prefix: string, name: string): string {
  return `${prefix}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "unknown"}`;
}

function player(name: unknown, prefix: string) {
  const safeName = asString(name) || "Unknown Player";
  return {
    id: playerId(prefix, safeName),
    name: safeName,
    handedness: "R" as Handedness,
  };
}

function runnersFrom(value: unknown): ArcadeRunners {
  const bases = asRecord(value);
  return {
    first: asBoolean(bases?.first),
    second: asBoolean(bases?.second),
    third: asBoolean(bases?.third),
  };
}

function titleCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function pitchTypeFor(eventType: string): string {
  if (eventType.includes("strikeout")) return "slider";
  if (eventType.includes("walk")) return "fastball";
  if (eventType.includes("home_run")) return "fastball";
  return "changeup";
}

function recommendedZoneFor(eventType: string): string {
  if (eventType.includes("strikeout")) return "low-away";
  if (eventType.includes("walk")) return "edge-away";
  if (eventType.includes("home_run")) return "middle";
  return "low-in";
}

function pitcherGameplay(difficulty: number, eventType: string): ArcadePitcherGameplay {
  return {
    targetSpeed: clampInt(60 + difficulty / 4, 60, 90),
    accuracyWindowMs: clampInt(220 - difficulty, 110, 220),
    perfectWindowMs: clampInt(90 - difficulty / 3, 40, 90),
    recommendedZone: recommendedZoneFor(eventType),
    visualPitchType: pitchTypeFor(eventType),
  };
}

function looksLikeArcadePack(value: unknown): value is ArcadeDailyPressurePack {
  const pack = asRecord(value);
  const moments = Array.isArray(pack?.moments) ? pack.moments : [];
  const firstMoment = asRecord(moments[0]);
  return Boolean(pack && firstMoment?.situation && firstMoment?.setup);
}

function adaptSdaMoment(value: unknown, index: number): ArcadeMoment | null {
  const source = asRecord(value);
  const cardPayload = asRecord(source?.cardPayload);
  const play = asRecord(cardPayload?.play);
  if (!source || !cardPayload || !play) return null;

  const difficulty = clampInt(source.difficulty, 0, 100);
  const eventType = asString(play.eventType) || "unknown";
  const scoreBefore = asRecord(play.scoreBefore);
  const label = asString(play.label) || titleCase(eventType) || "Pressure Play";
  const title = asString(cardPayload.title) || "MLB pressure moment";
  const description =
    asString(play.description) ||
    asString(cardPayload.description) ||
    "A high-pressure MLB moment.";
  const subLabel = asString(play.subLabel);
  const rank = clampInt(source.rank, index + 1, 999);

  return {
    id:
      asString(cardPayload.id) ||
      `${asString(source.gameId) || "game"}-${asNumber(source.playIndex, index)}`,
    rank,
    gameId: asString(source.gameId) || "unknown-game",
    // The current arcade build only has the pitcher mechanic wired through.
    // SDA pressure moments are still useful as pitcher challenges until the
    // hitter mechanic replaces the placeholder path.
    momentType: "pitcher",
    difficulty,
    pressureTier: asTier(source.tier),
    setup: {
      headline: `${label} - ${title}`,
      summary: description,
      whyThisMoment:
        subLabel || `Difficulty ${difficulty}/100, rank ${rank} in this pressure pack.`,
    },
    situation: {
      inning: clampInt(cardPayload.inning, 1, 99),
      half: asHalf(cardPayload.half),
      outs: clampInt(play.outsBefore, 0, 3),
      balls: clampInt(play.ballsBefore, 0, 3),
      strikes: clampInt(play.strikesBefore, 0, 2),
      awayTeam: "AWY",
      homeTeam: "HOME",
      awayScore: clampInt(scoreBefore?.away, 0, 99),
      homeScore: clampInt(scoreBefore?.home, 0, 99),
      runners: runnersFrom(play.baseStateBefore),
      batter: player(play.batterName, "batter"),
      pitcher: player(play.pitcherName, "pitcher"),
    },
    realOutcome: {
      label,
      description,
      resultType: eventType,
      runsScored: clampInt(play.runsScoredOnPlay, 0, 4),
      wpaBefore: 0,
      wpaAfter: 0,
      wpaDelta: 0,
    },
    gameplay: {
      pitcher: pitcherGameplay(difficulty, eventType),
    },
    recap: {
      afterReveal: description,
    },
  };
}

export function normalizePressurePack(value: unknown): ArcadeDailyPressurePack {
  if (looksLikeArcadePack(value)) {
    return value;
  }

  const source = asRecord(value);
  const rawMoments = Array.isArray(source?.moments) ? source.moments : [];
  const moments = rawMoments
    .map((moment, index) => adaptSdaMoment(moment, index))
    .filter((moment): moment is ArcadeMoment => moment !== null);

  return {
    date: asString(source?.date),
    title: "Daily MLB Pressure Run",
    subtitle: `${moments.length} moments from the main SDA pressure pack`,
    moments,
  };
}

async function readJsonSafe(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch (err) {
    // Caller still gets a usable no_pack response with empty date/detail;
    // the warn surfaces a possible upstream contract drift (e.g. SDA
    // renaming `date` in the 404 body) instead of silently masking it.
    // See error-handling-report.md §A1.
    console.warn(
      "[sdaArcadeClient] failed to parse JSON body",
      { status: res.status, error: err instanceof Error ? err.message : String(err) },
    );
    return null;
  }
}

async function fetchPack(path: string): Promise<PressurePackResponse> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network request failed";
    throw new ArcadeApiError(message, 0, null);
  }

  if (res.status === 404) {
    const body = (await readJsonSafe(res)) as
      | { detail?: unknown; date?: unknown }
      | null;
    return {
      ok: false,
      reason: "no_pack",
      date: asString(body?.date),
      detail: asString(body?.detail) || "No pressure pack available",
    };
  }

  if (!res.ok) {
    let detail: string | null = null;
    try {
      detail = await res.text();
    } catch {
      detail = null;
    }
    throw new ArcadeApiError(
      `Pressure pack request failed (${res.status})`,
      res.status,
      detail,
    );
  }

  const pack = normalizePressurePack(await res.json());
  return { ok: true, pack };
}

/** Fetch today's pressure pack from the BFF. */
export function fetchPressureToday(): Promise<PressurePackResponse> {
  return fetchPack(TODAY_PATH);
}

/**
 * Fetch the pressure pack for a specific ISO date (YYYY-MM-DD).
 * The date is URL-encoded so a malformed value cannot break the path.
 */
export function fetchPressureDaily(date: string): Promise<PressurePackResponse> {
  return fetchPack(`${DAILY_PATH_PREFIX}${encodeURIComponent(date)}`);
}
