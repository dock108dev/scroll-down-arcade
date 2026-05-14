"use client";

import { useEffect, useRef, useState } from "react";

import { AdBreakModal } from "@/components/AdBreakModal";
import { FieldState } from "@/components/FieldState";
import { MomentSetup } from "@/components/MomentSetup";
import { PitcherArcade } from "@/components/PitcherArcade";
import { RevealCard } from "@/components/RevealCard";
import { RunComplete } from "@/components/RunComplete";
import { Scoreboard } from "@/components/Scoreboard";
import { StartScreen } from "@/components/StartScreen";
import { StrikeCounter } from "@/components/StrikeCounter";
import { ArcadeApiError, fetchPressureToday } from "@/lib/api/sdaArcadeClient";
import type { ArcadeDailyPressurePack } from "@/lib/api/types";
import { useGameStore } from "@/lib/game/stateMachine";

/**
 * Top-level orchestrator that maps each `GameState` variant onto the
 * matching shell component.
 *
 * Off-day is a UI concern, not a state-machine state: when the BFF returns
 * "no pack today" we keep the store untouched and surface a dedicated
 * off-day card from local component state. That keeps the state machine
 * narrow (it never carries a `no_pack` variant) and lets the off-day copy
 * include the upstream `date`/`detail` strings verbatim.
 *
 * HitterArcade is still pending — its `hitter_gameplay` state renders a
 * labelled placeholder so the flow stays drivable end-to-end during
 * integration; the real component slots in by name later.
 *
 * `initialPack` is exposed for tests and Storybook so the orchestrator
 * can be mounted without a network fetch — in production this is unused
 * and the BFF fetch path runs on mount.
 */

function localIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface DailyRunProps {
  initialPack?: ArcadeDailyPressurePack;
  today?: string;
}

interface OffDayInfo {
  date: string;
  detail: string;
}

export function DailyRun({ initialPack, today }: DailyRunProps) {
  const gameState = useGameStore((s) => s.gameState);
  const actions = useGameStore((s) => s.actions);
  const [offDay, setOffDay] = useState<OffDayInfo | null>(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (initialPack && gameState.state === "loading_daily_pack") {
      actions.loadPack(initialPack);
      return;
    }
    if (fetchedRef.current) return;
    if (gameState.state !== "loading_daily_pack") return;
    fetchedRef.current = true;
    let cancelled = false;
    fetchPressureToday()
      .then((res) => {
        if (cancelled) return;
        if (!res.ok) {
          setOffDay({ date: res.date, detail: res.detail });
          return;
        }
        actions.loadPack(res.pack);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message =
          err instanceof ArcadeApiError
            ? err.message
            : "Failed to load today’s pressure pack";
        actions.failLoad(message);
      });
    return () => {
      cancelled = true;
    };
  }, [actions, gameState.state, initialPack]);

  if (offDay) {
    return (
      <section
        data-testid="off-day"
        className="flex flex-col gap-3 rounded-lg p-6"
        style={{
          backgroundColor: "var(--arcade-surface)",
          border: "1px solid var(--arcade-border)",
        }}
      >
        <h1
          className="text-xl font-bold uppercase tracking-widest"
          style={{ color: "var(--arcade-accent)" }}
        >
          No pack today
        </h1>
        <p
          className="text-sm"
          style={{ color: "var(--arcade-muted)" }}
        >
          {offDay.detail}
        </p>
        {offDay.date ? (
          <p
            data-testid="off-day-date"
            className="text-xs font-mono"
            style={{ color: "var(--arcade-muted)" }}
          >
            {offDay.date}
          </p>
        ) : null}
      </section>
    );
  }

  switch (gameState.state) {
    case "loading_daily_pack":
      return (
        <p
          data-testid="loading-pack"
          className="text-sm font-mono uppercase tracking-widest"
          style={{ color: "var(--arcade-muted)" }}
        >
          Loading today&rsquo;s pack…
        </p>
      );

    case "error":
      return (
        <section
          data-testid="error-state"
          className="rounded-lg p-6 flex flex-col gap-2"
          style={{
            backgroundColor: "var(--arcade-surface)",
            border: "1px solid var(--tier-extreme)",
          }}
        >
          <h1
            className="text-lg font-bold uppercase tracking-widest"
            style={{ color: "var(--tier-extreme)" }}
          >
            Couldn&rsquo;t load
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--arcade-muted)" }}
          >
            {gameState.error}
          </p>
        </section>
      );

    case "start":
      return (
        <StartScreen
          pack={gameState.pack}
          onStart={actions.startRun}
          today={today}
        />
      );

    case "moment_setup": {
      const moment = gameState.pack.moments[gameState.momentIndex];
      if (!moment) return null;
      return (
        <div className="flex flex-col gap-3">
          <Scoreboard situation={moment.situation} />
          <FieldState runners={moment.situation.runners} />
          <StrikeCounter strikesRemaining={gameState.strikesRemaining} />
          <MomentSetup
            setup={moment.setup}
            momentType={moment.momentType}
            pressureTier={moment.pressureTier}
            onStart={actions.beginMoment}
          />
        </div>
      );
    }

    case "hitter_gameplay": {
      // HitterArcade ships in a separate issue. Render a labelled
      // placeholder so the flow stays drivable end-to-end during
      // integration; the real component slots in by name later.
      return (
        <div className="flex flex-col gap-3">
          <StrikeCounter strikesRemaining={gameState.strikesRemaining} />
          <p
            data-testid="hitter-placeholder"
            className="text-sm font-mono"
            style={{ color: "var(--arcade-muted)" }}
          >
            Hitter mechanic pending integration.
          </p>
        </div>
      );
    }

    case "pitcher_gameplay": {
      const moment = gameState.pack.moments[gameState.momentIndex];
      if (!moment?.gameplay.pitcher) return null;
      return (
        <div className="flex flex-col gap-3">
          <StrikeCounter strikesRemaining={gameState.strikesRemaining} />
          <PitcherArcade
            gameplay={moment.gameplay.pitcher}
            onSubmit={actions.submitPitch}
          />
        </div>
      );
    }

    case "reveal": {
      const moment = gameState.pack.moments[gameState.momentIndex];
      if (!moment) return null;
      const isFinalMoment =
        gameState.momentIndex + 1 >= gameState.pack.moments.length;
      return (
        <div className="flex flex-col gap-3">
          <StrikeCounter strikesRemaining={gameState.strikesRemaining} />
          <RevealCard
            moment={moment}
            lastOutcome={gameState.lastOutcome}
            onAdvance={actions.advanceFromReveal}
            isFinalMoment={isFinalMoment}
          />
        </div>
      );
    }

    case "ad_break":
      return <AdBreakModal onContinue={actions.continueAfterAd} />;

    case "run_complete":
      return (
        <RunComplete
          runScore={gameState.runScore}
          today={today ?? localIsoDate()}
        />
      );
  }
}

export default DailyRun;
