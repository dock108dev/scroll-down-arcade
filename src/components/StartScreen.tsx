"use client";

import { useProgressionStore } from "@/stores/progressionStore";
import type { ArcadeDailyPressurePack } from "@/lib/api/types";

/**
 * Pre-run welcome screen rendered from the state machine's `start` state.
 *
 * Three branches share this component because they share the same chrome
 * (title, subtitle, framing):
 *  - First-ever run (`runsStarted === 0`): clean welcome, no progression
 *    chrome — the first-time experience stays uncluttered.
 *  - Returning player on a new day: streak badge (when > 0) and personal
 *    best (when > 0) precede the CTA so the player sees what they're
 *    defending before they tap in.
 *  - Already played today (`lastPlayedDate === today`): no CTA, replaced
 *    by an "already played" line that surfaces streak/rank. The personal
 *    best line is intentionally hidden here — the message itself carries
 *    the returning-player context.
 *
 * `today` is injectable so tests can deterministically place the player in
 * the already-played branch without mocking `Date`.
 */

interface StartScreenProps {
  pack: ArcadeDailyPressurePack;
  onStart: () => void;
  /** ISO date (YYYY-MM-DD). Defaults to the runtime local-date. */
  today?: string;
}

function localIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function StartScreen({ pack, onStart, today }: StartScreenProps) {
  const runsStarted = useProgressionStore((s) => s.runsStarted);
  const bestScore = useProgressionStore((s) => s.bestScore);
  const dailyStreak = useProgressionStore((s) => s.dailyStreak);
  const lastPlayedDate = useProgressionStore((s) => s.lastPlayedDate);

  const todayDate = today ?? localIsoDate();
  const alreadyPlayedToday = lastPlayedDate === todayDate;
  const isReturning = runsStarted >= 1;

  return (
    <section
      data-testid="start-screen"
      data-returning={isReturning ? "true" : "false"}
      data-already-played={alreadyPlayedToday ? "true" : "false"}
      className="flex flex-col gap-4 rounded-lg p-6"
      style={{
        backgroundColor: "var(--arcade-surface)",
        border: "1px solid var(--arcade-border)",
      }}
    >
      <header className="flex flex-col gap-1">
        <h1
          className="text-2xl font-bold tracking-wide"
          style={{ color: "var(--arcade-accent)" }}
        >
          {pack.title}
        </h1>
        <p
          className="text-sm"
          style={{ color: "var(--arcade-muted)" }}
        >
          {pack.subtitle}
        </p>
      </header>

      {alreadyPlayedToday ? (
        <div
          data-testid="already-played-block"
          className="flex flex-col gap-2"
        >
          <p
            className="text-base font-bold"
            style={{ color: "var(--arcade-text)" }}
          >
            You&rsquo;ve played today.
          </p>
          {dailyStreak > 0 ? (
            <p
              data-testid="already-played-streak"
              className="text-sm font-mono"
              style={{ color: "var(--arcade-muted)" }}
            >
              Streak:{" "}
              <span
                className="font-bold"
                style={{ color: "var(--arcade-accent)" }}
              >
                {dailyStreak} day{dailyStreak === 1 ? "" : "s"}
              </span>
            </p>
          ) : null}
        </div>
      ) : (
        <>
          {isReturning && dailyStreak > 0 ? (
            <p
              data-testid="streak-badge"
              className="text-sm font-mono"
              style={{ color: "var(--arcade-muted)" }}
            >
              Streak:{" "}
              <span
                className="font-bold"
                style={{ color: "var(--arcade-accent)" }}
              >
                {dailyStreak} day{dailyStreak === 1 ? "" : "s"}
              </span>
            </p>
          ) : null}

          {isReturning && bestScore > 0 ? (
            <p
              data-testid="personal-best"
              className="text-sm font-mono"
              style={{ color: "var(--arcade-muted)" }}
            >
              Personal best:{" "}
              <span
                className="font-bold"
                style={{ color: "var(--arcade-accent)" }}
              >
                {bestScore.toLocaleString()} pts
              </span>
            </p>
          ) : null}

          <button
            type="button"
            data-testid="start-cta"
            onClick={onStart}
            className="w-full rounded-md py-3 font-bold text-black"
            style={{ backgroundColor: "var(--arcade-accent)" }}
          >
            {isReturning ? "Start today’s run" : "Start Daily Run"}
          </button>
        </>
      )}
    </section>
  );
}

export default StartScreen;
