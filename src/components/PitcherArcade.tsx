"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ArcadePitcherGameplay, PitchResult } from "@/lib/api/types";
import { titleCasePitchType, ZONE_QUADRANTS } from "@/lib/game/timing";

/**
 * Two-phase pitcher arcade mechanic.
 *
 * Phase 1 — targeting: the player picks a strike-zone cell. The
 * `recommendedZone` cell carries an amber tint to hint at the high-value
 * spot. Selecting any cell advances to phase 2.
 *
 * Phase 2 — release: an instruction line invites the player to hit the
 * release window. A click on the release meter resolves the pitch; the
 * meter also auto-resolves on timeout so a non-clicking player still
 * surfaces a deterministic outcome.
 *
 * The `visualPitchType` label sits above the zone grid and stays mounted
 * through both phases — it identifies WHAT pitch is being thrown, while
 * the recommended-zone tint hints at WHERE. The label never overlaps the
 * grid or the release meter: it lives in its own row of the flex column
 * above both.
 */

export interface PitcherArcadeProps {
  gameplay: ArcadePitcherGameplay;
  onSubmit: (result: PitchResult) => void;
}

type Phase = "targeting" | "release";

const RELEASE_INSTRUCTION = "Tap to release on the line";

// Default fallback outcome when the player never engages the release meter.
const RELEASE_TIMEOUT_RESULT: PitchResult = "ball";

function classifyRelease(
  elapsedMs: number,
  perfectWindowMs: number,
  accuracyWindowMs: number,
  zoneMatchedRecommendation: boolean,
): PitchResult {
  // Treat the midpoint of the meter sweep as the release target. The
  // perfect window is centered there; the broader accuracy window forms
  // the "good" band; anything outside is a competitive miss or hanger.
  const target = accuracyWindowMs / 2;
  const delta = Math.abs(elapsedMs - target);

  if (delta <= perfectWindowMs / 2) {
    return zoneMatchedRecommendation ? "perfect_pitch" : "good_pitch";
  }
  if (delta <= accuracyWindowMs / 2) {
    return "good_pitch";
  }
  // Outside the accuracy band — either a competitive miss (close) or a
  // hanger (very late / very early). Treat extreme deltas as hangers so
  // the strike-cost path is exercised.
  if (delta <= accuracyWindowMs) {
    return "competitive_miss";
  }
  return "hanger";
}

export function PitcherArcade({ gameplay, onSubmit }: PitcherArcadeProps) {
  const [phase, setPhase] = useState<Phase>("targeting");
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const submittedRef = useRef(false);
  const phaseStartRef = useRef<number>(0);

  const { recommendedZone, visualPitchType, perfectWindowMs, accuracyWindowMs } =
    gameplay;
  const pitchTypeLabel = titleCasePitchType(visualPitchType);

  const submit = useCallback(
    (result: PitchResult) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      onSubmit(result);
    },
    [onSubmit],
  );

  const handleZoneClick = useCallback((zone: string) => {
    setSelectedZone((prev) => {
      if (prev !== null) return prev;
      phaseStartRef.current =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      setPhase("release");
      return zone;
    });
  }, []);

  const handleReleaseClick = useCallback(() => {
    if (phase !== "release" || selectedZone === null) return;
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const elapsed = now - phaseStartRef.current;
    const result = classifyRelease(
      elapsed,
      perfectWindowMs,
      accuracyWindowMs,
      selectedZone === recommendedZone,
    );
    submit(result);
  }, [
    accuracyWindowMs,
    perfectWindowMs,
    phase,
    recommendedZone,
    selectedZone,
    submit,
  ]);

  // Auto-submit safety net: if the player never taps the release meter,
  // resolve the pitch as a `ball` after the accuracy window elapses so
  // the state machine still advances. Duration is `accuracyWindowMs * 2`
  // so the player has a full sweep to react before the timeout fires.
  useEffect(() => {
    if (phase !== "release") return;
    const timer = window.setTimeout(() => {
      submit(RELEASE_TIMEOUT_RESULT);
    }, accuracyWindowMs * 2);
    return () => window.clearTimeout(timer);
  }, [accuracyWindowMs, phase, submit]);

  return (
    <section
      data-testid="pitcher-arcade"
      data-phase={phase}
      className="rounded-lg p-4 flex flex-col gap-4"
      style={{
        backgroundColor: "var(--arcade-surface)",
        border: "1px solid var(--arcade-border)",
      }}
    >
      <span
        data-testid="role-badge"
        className="self-start rounded-full px-3 py-1 text-xs font-mono uppercase tracking-wide bg-orange-950 text-orange-300 border border-orange-700"
      >
        ⚾ YOU ARE THE PITCHER
      </span>

      <div className="flex flex-col gap-1" data-testid="pitch-type-block">
        <p
          className="text-xs font-mono uppercase tracking-widest"
          style={{ color: "var(--arcade-muted)" }}
        >
          Pitch type
        </p>
        <p
          data-testid="pitch-type-label"
          className="text-lg font-bold"
          style={{ color: "var(--arcade-accent)" }}
        >
          {pitchTypeLabel}
        </p>
      </div>

      <div
        data-testid="zone-grid"
        role="grid"
        aria-label="Strike zone targeting grid"
        className="grid grid-cols-3 gap-1 mx-auto"
        style={{
          width: "min(100%, 240px)",
          aspectRatio: "1 / 1",
          border: "1px solid var(--arcade-border)",
          padding: "4px",
        }}
      >
        {ZONE_QUADRANTS.map((zone) => {
          const isRecommended = zone === recommendedZone;
          const isSelected = zone === selectedZone;
          const isTargetable = phase === "targeting";
          return (
            <button
              key={zone}
              type="button"
              role="gridcell"
              data-testid={`zone-${zone}`}
              data-recommended={isRecommended ? "true" : "false"}
              data-selected={isSelected ? "true" : "false"}
              disabled={!isTargetable}
              onClick={() => handleZoneClick(zone)}
              className="flex items-center justify-center text-[10px] font-mono uppercase tracking-wide"
              style={{
                backgroundColor: isSelected
                  ? "var(--arcade-accent)"
                  : isRecommended
                    ? "rgba(245, 158, 11, 0.25)"
                    : "var(--arcade-bg)",
                color: isSelected ? "#000" : "var(--arcade-muted)",
                border: "1px solid var(--arcade-border)",
                cursor: isTargetable ? "pointer" : "default",
              }}
            >
              {zone}
            </button>
          );
        })}
      </div>

      {phase === "release" ? (
        <div className="flex flex-col gap-2" data-testid="release-block">
          <p
            data-testid="release-instruction"
            className="text-sm text-center"
            style={{ color: "var(--arcade-text)" }}
          >
            {RELEASE_INSTRUCTION}
          </p>
          <button
            type="button"
            data-testid="release-meter"
            onClick={handleReleaseClick}
            className="relative w-full overflow-hidden rounded-md"
            style={{
              height: "32px",
              backgroundColor: "var(--arcade-bg)",
              border: "1px solid var(--arcade-border)",
            }}
          >
            <span
              aria-hidden="true"
              className="absolute top-0 bottom-0"
              style={{
                left: "50%",
                width: "2px",
                backgroundColor: "var(--arcade-accent)",
              }}
            />
          </button>
        </div>
      ) : null}
    </section>
  );
}

export default PitcherArcade;
