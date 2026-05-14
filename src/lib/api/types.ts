/**
 * Arcade wire-contract types.
 *
 * These shapes describe the daily pressure pack the arcade BFF will serve
 * (today read from the fixture in `src/lib/fixtures/dailyPressurePack.sample.json`,
 * later from the SDA pressure endpoint). Keep these in sync with the fixture —
 * the fixture is imported with type assertion in tests to enforce the match.
 */

export type MomentType = "hitter" | "pitcher";

export type PressureTier = "low" | "medium" | "high" | "extreme";

export type InningHalf = "top" | "bottom";

export type Handedness = "L" | "R" | "S";

export type TimingResult =
  | "perfect"
  | "good"
  | "okay"
  | "early"
  | "late"
  | "miss";

export type PitchResult =
  | "perfect_pitch"
  | "good_pitch"
  | "competitive_miss"
  | "ball"
  | "hanger";

export interface ArcadeMomentSetup {
  headline: string;
  summary: string;
  whyThisMoment: string;
}

export interface ArcadeRunners {
  first: boolean;
  second: boolean;
  third: boolean;
}

export interface ArcadePlayer {
  id: string;
  name: string;
  handedness: Handedness;
}

export interface ArcadeSituation {
  inning: number;
  half: InningHalf;
  outs: number;
  balls: number;
  strikes: number;
  awayTeam: string;
  homeTeam: string;
  awayScore: number;
  homeScore: number;
  runners: ArcadeRunners;
  batter: ArcadePlayer;
  pitcher: ArcadePlayer;
}

export interface ArcadeRealOutcome {
  label: string;
  description: string;
  resultType: string;
  runsScored: number;
  wpaBefore: number;
  wpaAfter: number;
  wpaDelta: number;
}

export interface ArcadeHitterGameplay {
  pitchSpeed: number;
  timingWindowMs: number;
  perfectWindowMs: number;
  pitchPath: string;
  visualPitchType: string;
}

export interface ArcadePitcherGameplay {
  targetSpeed: number;
  accuracyWindowMs: number;
  perfectWindowMs: number;
  recommendedZone: string;
  visualPitchType: string;
}

/**
 * Gameplay is a discriminated payload keyed by the moment's role.
 * Exactly one of `hitter` / `pitcher` is populated in practice; both are
 * optional in the type so a single shape can carry either subtype.
 */
export interface ArcadeGameplay {
  hitter?: ArcadeHitterGameplay;
  pitcher?: ArcadePitcherGameplay;
}

export interface ArcadeRecap {
  afterReveal: string;
}

export interface ArcadeMoment {
  id: string;
  rank: number;
  gameId: string;
  momentType: MomentType;
  /** 0–100, higher = harder arcade challenge. */
  difficulty: number;
  pressureTier: PressureTier;
  setup: ArcadeMomentSetup;
  situation: ArcadeSituation;
  realOutcome: ArcadeRealOutcome;
  gameplay: ArcadeGameplay;
  recap: ArcadeRecap;
}

export interface ArcadeDailyPressurePack {
  /** ISO date (YYYY-MM-DD) the pack is scheduled for. */
  date: string;
  title: string;
  subtitle: string;
  moments: ArcadeMoment[];
}
