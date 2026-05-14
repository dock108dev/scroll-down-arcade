"use client";

import type { CSSProperties } from "react";

import type { ArcadeMoment, PressureTier } from "@/lib/api/types";
import type { MomentResult } from "@/lib/game/scoring";
import type { RevealOutcome } from "@/lib/game/stateMachine";

/**
 * Post-moment reveal screen.
 *
 * Visual order is intentionally player-first: the user's own result is the
 * largest typographic element on the card (`text-4xl` flashed in the matching
 * `var(--result-*)` token), the MLB outcome lives below a divider as the
 * "real result" reveal, and the WPA delta is a colour-filled pill keyed to
 * the moment's pressure tier so a glance reads the leverage of the spot.
 *
 * The `realOutcome` payload and `recap.afterReveal` come from the moment
 * fixture (later the SDA pressure endpoint); they are rendered verbatim
 * without truncation.
 */

interface RevealCardProps {
  moment: ArcadeMoment;
  lastOutcome: RevealOutcome;
  onAdvance: () => void;
  /** Last moment in the pack → CTA reads "See results" instead of "Next moment". */
  isFinalMoment: boolean;
}

// Map every `MomentResult` onto a CSS-variable suffix and a display label.
// The CSS tokens (see globals.css `--result-*`) use kebab-case; the pitcher
// variants (`perfect_pitch`, `good_pitch`) collapse onto the same colour as
// their hitter peers since the palette only defines five result hues.
const RESULT_CATEGORY: Record<MomentResult, string> = {
  perfect: "perfect",
  good: "good",
  okay: "okay",
  early: "early",
  late: "late",
  miss: "miss",
  perfect_pitch: "perfect",
  good_pitch: "good",
  competitive_miss: "competitive-miss",
  ball: "ball",
  hanger: "hanger",
};

const RESULT_LABEL: Record<MomentResult, string> = {
  perfect: "PERFECT HIT",
  good: "GOOD HIT",
  okay: "OKAY",
  early: "EARLY",
  late: "LATE",
  miss: "MISS",
  perfect_pitch: "PERFECT PITCH",
  good_pitch: "GOOD PITCH",
  competitive_miss: "COMPETITIVE MISS",
  ball: "BALL",
  hanger: "HANGER",
};

function resultColorVar(result: MomentResult): string {
  return `var(--result-${RESULT_CATEGORY[result]})`;
}

function formatWpaDelta(delta: number): string {
  const rounded = Math.round(delta * 100) / 100;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(2)} WPA`;
}

function tierStyle(tier: PressureTier): CSSProperties {
  return { backgroundColor: `var(--tier-${tier})` };
}

export function RevealCard({
  moment,
  lastOutcome,
  onAdvance,
  isFinalMoment,
}: RevealCardProps) {
  const { realOutcome, recap, pressureTier } = moment;
  const { result, scoreEarned } = lastOutcome;

  return (
    <section
      data-testid="reveal-card"
      data-result={result}
      data-pressure-tier={pressureTier}
      className="flex flex-col gap-4 rounded-xl p-5"
      style={{
        backgroundColor: "var(--arcade-surface)",
        border: "1px solid var(--arcade-border)",
      }}
    >
      <p
        data-testid="reveal-result-label"
        className="text-4xl font-bold font-mono"
        style={{ color: resultColorVar(result) }}
      >
        {RESULT_LABEL[result]}
      </p>

      <p
        data-testid="reveal-points-badge"
        className="text-xl font-mono"
        style={{ color: "var(--arcade-accent)" }}
      >
        +{scoreEarned.toLocaleString()} pts
      </p>

      <div
        data-testid="reveal-divider"
        className="flex flex-col gap-1 pt-3"
        style={{ borderTop: "1px solid var(--arcade-border)" }}
      >
        <p
          className="text-xs uppercase tracking-widest"
          style={{ color: "var(--arcade-muted)" }}
        >
          Real MLB Result
        </p>
        <p
          data-testid="reveal-real-outcome"
          className="text-2xl font-bold"
          style={{ color: "var(--arcade-text)" }}
        >
          {realOutcome.label}
        </p>
        <p
          className="text-sm"
          style={{ color: "var(--arcade-muted)" }}
        >
          {realOutcome.description}
        </p>
      </div>

      <span
        data-testid="reveal-wpa-badge"
        className="self-start rounded-full px-2 py-0.5 text-xs font-mono text-white"
        style={tierStyle(pressureTier)}
      >
        {formatWpaDelta(realOutcome.wpaDelta)}
      </span>

      <p
        data-testid="reveal-recap"
        className="text-sm italic"
        style={{ color: "var(--arcade-muted)" }}
      >
        {recap.afterReveal}
      </p>

      <button
        type="button"
        data-testid="reveal-cta"
        onClick={onAdvance}
        className="w-full rounded-md py-3 font-bold text-black"
        style={{ backgroundColor: "var(--arcade-accent)" }}
      >
        {isFinalMoment ? "See results" : "Next moment"}
      </button>
    </section>
  );
}

export default RevealCard;
