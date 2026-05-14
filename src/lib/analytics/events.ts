/**
 * Arcade analytics event stub.
 *
 * MVP analytics is intentionally a console passthrough — no provider SDK,
 * no network calls. The discriminated `ArcadeEvent` union is the contract
 * call sites code against, so swapping the implementation later (Segment,
 * Amplitude, GA, etc.) won't ripple through every emitter.
 *
 * In development, `trackEvent` logs a single tagged line per call so a
 * developer can see the firehose in the browser/server console. In any
 * other NODE_ENV (production, test, preview, etc.) it is a true no-op —
 * no console writes, no allocations beyond the function call itself.
 */

import type { PitchResult, TimingResult } from "@/lib/api/types";

export type ArcadeEvent =
  | { name: "moment_started"; momentId: string; momentType: "hitter" | "pitcher"; rank: number }
  | { name: "swing_result"; momentId: string; result: TimingResult; score: number }
  | { name: "pitch_result"; momentId: string; result: PitchResult; score: number }
  | { name: "moment_completed"; momentId: string; cleared: boolean }
  | { name: "ad_break_shown"; strikesUsed: number; momentIndex: number }
  | { name: "ad_break_continued" }
  | { name: "run_completed"; finalScore: number; momentsCleared: number; perfectHits: number }
  | { name: "pack_loaded"; date: string; source: "api" | "fixture" };

export function trackEvent(event: ArcadeEvent): void {
  if (process.env.NODE_ENV === "development") {
    console.log("[arcade:analytics]", event.name, event);
  }
}
