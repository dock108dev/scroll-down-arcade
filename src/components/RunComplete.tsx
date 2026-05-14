"use client";

import { useEffect, useRef, useState } from "react";

import type { RunScore } from "@/lib/game/stateMachine";
import { computeRank, useProgressionStore } from "@/stores/progressionStore";

/**
 * End-of-run summary screen.
 *
 * Visual hierarchy follows the design contract — Score is the hero
 * (`text-6xl`), Rank + Streak are the prominent secondary row
 * (`text-2xl`), XP-gained is the FOMO line (`text-lg` accent), and the
 * three supporting metrics share a muted 3-column grid (`text-sm`).
 *
 * Side effect on mount: commits this run into the persisted progression
 * store via `actions.recordRun`. The `mountedRef` guard makes the call
 * idempotent under React StrictMode (double-invoke in development) and
 * under any future remount the parent might trigger — the long-term
 * stats must not be double-counted.
 *
 * The rank-up callout compares the rank computed *before* `recordRun`
 * fires (frozen at first render via `useState`) against the rank
 * computed from the post-bump `totalXp`. When the tier crossed a
 * threshold this run, the amber banner renders between the hero score
 * and the primary row.
 */

interface RunCompleteProps {
  runScore: RunScore;
  today: string;
  /** Optional override for share copy. Defaults to a generic arcade prompt. */
  shareText?: string;
}

export function RunComplete({ runScore, today, shareText }: RunCompleteProps) {
  const totalXp = useProgressionStore((s) => s.totalXp);
  const dailyStreak = useProgressionStore((s) => s.dailyStreak);
  const recordRun = useProgressionStore((s) => s.actions.recordRun);

  const [previousRank] = useState(() => computeRank(totalXp));
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    recordRun(
      {
        totalPoints: runScore.totalPoints,
        momentsCleared: runScore.momentsCleared,
        perfectHits: runScore.perfectHits,
        strikesUsed: runScore.strikesUsed,
      },
      today,
    );
  }, [recordRun, runScore, today]);

  const currentRank = computeRank(totalXp);
  const rankUp = currentRank.tier > previousRank.tier;
  const xpGained = runScore.totalPoints;

  const handleShare = () => {
    const text =
      shareText ??
      `I scored ${runScore.totalPoints.toLocaleString()} in today's MLB Daily Pressure Run.`;
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      navigator.share({ text }).catch(() => {
        /* user cancel / unsupported — share is a soft action */
      });
      return;
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {
        /* clipboard denied — soft action */
      });
    }
  };

  return (
    <section
      data-testid="run-complete"
      data-rank-up={rankUp ? "true" : "false"}
      className="flex flex-col gap-5 rounded-lg p-6"
      style={{
        backgroundColor: "var(--arcade-surface)",
        border: "1px solid var(--arcade-border)",
      }}
    >
      <p
        data-testid="run-complete-score"
        className="text-6xl font-mono font-bold text-center"
        style={{ color: "var(--arcade-accent)" }}
      >
        {runScore.totalPoints.toLocaleString()}
      </p>

      {rankUp ? (
        <div
          data-testid="run-complete-rank-up"
          className="w-full rounded-lg py-2 text-center font-bold"
          style={{
            backgroundColor: "color-mix(in srgb, var(--arcade-accent) 20%, transparent)",
            border: "1px solid var(--arcade-accent)",
            color: "var(--arcade-accent)",
          }}
        >
          Rank up! {previousRank.label} → {currentRank.label}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3" data-testid="run-complete-primary">
        <div className="flex flex-col">
          <span
            className="text-xs uppercase tracking-widest"
            style={{ color: "var(--arcade-muted)" }}
          >
            Rank
          </span>
          <span
            data-testid="run-complete-rank"
            className="text-2xl font-bold"
            style={{ color: "var(--arcade-text)" }}
          >
            {currentRank.label}
          </span>
        </div>
        <div className="flex flex-col">
          <span
            className="text-xs uppercase tracking-widest"
            style={{ color: "var(--arcade-muted)" }}
          >
            Streak
          </span>
          <span
            data-testid="run-complete-streak"
            className="text-2xl font-bold"
            style={{ color: "var(--arcade-text)" }}
          >
            {dailyStreak} day{dailyStreak === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <p
        data-testid="run-complete-xp"
        className="text-lg"
        style={{ color: "var(--arcade-accent)" }}
      >
        +{xpGained.toLocaleString()} XP
      </p>

      <div
        data-testid="run-complete-supporting"
        className="grid grid-cols-3 gap-2 text-sm"
        style={{ color: "var(--arcade-muted)" }}
      >
        <div className="flex flex-col">
          <span data-testid="run-complete-moments" className="font-mono">
            {runScore.momentsCleared}
          </span>
          <span className="text-xs uppercase tracking-wide">Moments</span>
        </div>
        <div className="flex flex-col">
          <span data-testid="run-complete-perfects" className="font-mono">
            {runScore.perfectHits}
          </span>
          <span className="text-xs uppercase tracking-wide">Perfect</span>
        </div>
        <div className="flex flex-col">
          <span data-testid="run-complete-strikes" className="font-mono">
            {runScore.strikesUsed}
          </span>
          <span className="text-xs uppercase tracking-wide">Strikes</span>
        </div>
      </div>

      <button
        type="button"
        data-testid="run-complete-share"
        onClick={handleShare}
        className="w-full rounded-md py-3 font-bold"
        style={{
          backgroundColor: "var(--arcade-surface)",
          border: "1px solid var(--arcade-border)",
          color: "var(--arcade-text)",
        }}
      >
        Share
      </button>
    </section>
  );
}

export default RunComplete;
