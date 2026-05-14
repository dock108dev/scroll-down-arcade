/**
 * Scoring primitives shared by the game state machine.
 *
 * Minimal canonical implementations of the functions the state machine
 * depends on. The full scoring/progression module — including pressure-tier
 * bonuses, perfect-rate stats, and rank thresholds — will extend this file.
 * The public signatures here are the contract: do not rename or change
 * argument order without updating every caller.
 */

import type { PitchResult, TimingResult } from "@/lib/api/types";

/** Result of either the hitter swing or pitcher pitch mechanic. */
export type MomentResult = TimingResult | PitchResult;

/** Role of the human player for a moment — selects the scoring table. */
export type MomentRole = "hitter" | "pitcher";

const STRIKE_RESULTS: ReadonlySet<MomentResult> = new Set<MomentResult>([
  "miss",
  "hanger",
]);

const HITTER_BASE_SCORES: Readonly<Record<TimingResult, number>> = {
  perfect: 100,
  good: 70,
  okay: 35,
  early: 0,
  late: 0,
  miss: 0,
};

const PITCHER_BASE_SCORES: Readonly<Record<PitchResult, number>> = {
  perfect_pitch: 100,
  good_pitch: 70,
  competitive_miss: 35,
  ball: 0,
  hanger: 0,
};

/**
 * True when the result costs the player a strike.
 * Hitter: `miss`. Pitcher: `hanger`. All other outcomes are non-strike.
 */
export function isStrikeResult(result: MomentResult): boolean {
  return STRIKE_RESULTS.has(result);
}

/** True when the moment counts as cleared (i.e. the player did not lose a strike). */
export function momentCleared(result: MomentResult): boolean {
  return !isStrikeResult(result);
}

/**
 * Pressure multiplier from difficulty (0–100). Linear: 0 → 1.0x, 100 → 2.0x.
 * Values outside the range are clamped so a noisy fixture cannot blow up scoring.
 */
function pressureMultiplier(difficulty: number): number {
  const clamped = Math.max(0, Math.min(100, difficulty));
  return 1 + clamped / 100;
}

/**
 * Compute the score earned for a single moment outcome.
 * Combines a role-specific base value with the difficulty-derived multiplier.
 */
export function calculateMomentScore(
  result: MomentResult,
  difficulty: number,
  role: MomentRole,
): number {
  const base =
    role === "hitter"
      ? HITTER_BASE_SCORES[result as TimingResult] ?? 0
      : PITCHER_BASE_SCORES[result as PitchResult] ?? 0;
  if (base === 0) return 0;
  return Math.round(base * pressureMultiplier(difficulty));
}
