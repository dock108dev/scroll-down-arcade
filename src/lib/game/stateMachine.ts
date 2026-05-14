/**
 * Daily-run state machine for the arcade.
 *
 * Models the player-facing flow as a discriminated union (`GameState`) and
 * exposes a Zustand store that owns the transitions. The store is
 * deliberately *not* persisted to localStorage — incomplete runs are not
 * survivable across page reload, and `progressionStore.recordRun()` is only
 * invoked from the RunComplete component on mount, never from this file.
 *
 * One-action-per-moment: `submitSwing` and `submitPitch` are idempotent in
 * the same `*_gameplay` state — the state guard plus the `actionTaken` flag
 * make a second synchronous call a no-op.
 */

import { create } from "zustand";

import type {
  ArcadeDailyPressurePack,
  ArcadeMoment,
  PitchResult,
  TimingResult,
} from "@/lib/api/types";
import {
  calculateMomentScore,
  isStrikeResult,
  momentCleared,
  type MomentResult,
  type MomentRole,
} from "@/lib/game/scoring";
import { useProgressionStore } from "@/stores/progressionStore";

/** Strikes granted at the start of a run and after each ad-break continue. */
export const STARTING_STRIKES = 3;

export interface RunScore {
  totalPoints: number;
  momentsCleared: number;
  perfectHits: number;
  strikesUsed: number;
}

const INITIAL_RUN_SCORE: RunScore = {
  totalPoints: 0,
  momentsCleared: 0,
  perfectHits: 0,
  strikesUsed: 0,
};

export interface RevealOutcome {
  result: MomentResult;
  scoreEarned: number;
  lostStrike: boolean;
  cleared: boolean;
  role: MomentRole;
}

export type GameState =
  | { state: "loading_daily_pack" }
  | { state: "error"; error: string }
  | { state: "start"; pack: ArcadeDailyPressurePack }
  | {
      state: "moment_setup";
      pack: ArcadeDailyPressurePack;
      momentIndex: number;
      strikesRemaining: number;
      runScore: RunScore;
    }
  | {
      state: "hitter_gameplay";
      pack: ArcadeDailyPressurePack;
      momentIndex: number;
      strikesRemaining: number;
      runScore: RunScore;
      actionTaken: boolean;
    }
  | {
      state: "pitcher_gameplay";
      pack: ArcadeDailyPressurePack;
      momentIndex: number;
      strikesRemaining: number;
      runScore: RunScore;
      actionTaken: boolean;
    }
  | {
      state: "reveal";
      pack: ArcadeDailyPressurePack;
      momentIndex: number;
      strikesRemaining: number;
      runScore: RunScore;
      lastOutcome: RevealOutcome;
    }
  | {
      state: "ad_break";
      pack: ArcadeDailyPressurePack;
      momentIndex: number;
      runScore: RunScore;
      lastOutcome: RevealOutcome;
    }
  | {
      state: "run_complete";
      pack: ArcadeDailyPressurePack;
      runScore: RunScore;
    };

export interface GameActions {
  /** Pack fetched successfully → enter `start`. */
  loadPack: (pack: ArcadeDailyPressurePack) => void;
  /** Pack fetch failed → enter `error`. */
  failLoad: (error: string) => void;
  /** Begin a run from the `start` state. Resets strikes and runScore. */
  startRun: () => void;
  /** Leave `moment_setup` and enter the role-specific gameplay state. */
  beginMoment: () => void;
  /** Submit the hitter's swing result. No-op outside `hitter_gameplay`. */
  submitSwing: (result: TimingResult) => void;
  /** Submit the pitcher's pitch result. No-op outside `pitcher_gameplay`. */
  submitPitch: (result: PitchResult) => void;
  /** Move from `reveal` to the next moment or `run_complete`. */
  advanceFromReveal: () => void;
  /** Leave `ad_break` with fresh strikes, retrying the current moment. */
  continueAfterAd: () => void;
  /** Hard reset back to `loading_daily_pack`. */
  reset: () => void;
}

interface Store {
  gameState: GameState;
  actions: GameActions;
}

const INITIAL_STATE: GameState = { state: "loading_daily_pack" };

function currentMoment(
  pack: ArcadeDailyPressurePack,
  momentIndex: number,
): ArcadeMoment | null {
  return pack.moments[momentIndex] ?? null;
}

type GameplayState = Extract<
  GameState,
  { state: "hitter_gameplay" | "pitcher_gameplay" }
>;

function applyResult(
  prev: GameplayState,
  result: MomentResult,
  role: MomentRole,
): GameState {
  const moment = currentMoment(prev.pack, prev.momentIndex);
  if (!moment) {
    return { state: "error", error: "Missing moment for result submission" };
  }

  const scoreEarned = calculateMomentScore(result, moment.difficulty, role);
  const lostStrike = isStrikeResult(result);
  const cleared = momentCleared(result);
  const isPerfect = result === "perfect" || result === "perfect_pitch";

  const newStrikes = lostStrike
    ? prev.strikesRemaining - 1
    : prev.strikesRemaining;

  const nextScore: RunScore = {
    totalPoints: prev.runScore.totalPoints + scoreEarned,
    momentsCleared: prev.runScore.momentsCleared + (cleared ? 1 : 0),
    perfectHits: prev.runScore.perfectHits + (isPerfect ? 1 : 0),
    strikesUsed: prev.runScore.strikesUsed + (lostStrike ? 1 : 0),
  };

  const lastOutcome: RevealOutcome = {
    result,
    scoreEarned,
    lostStrike,
    cleared,
    role,
  };

  if (newStrikes <= 0) {
    return {
      state: "ad_break",
      pack: prev.pack,
      momentIndex: prev.momentIndex,
      runScore: nextScore,
      lastOutcome,
    };
  }

  return {
    state: "reveal",
    pack: prev.pack,
    momentIndex: prev.momentIndex,
    strikesRemaining: newStrikes,
    runScore: nextScore,
    lastOutcome,
  };
}

export const useGameStore = create<Store>()((set, get) => ({
  gameState: INITIAL_STATE,
  actions: {
    loadPack: (pack) => {
      set({ gameState: { state: "start", pack } });
    },

    failLoad: (error) => {
      set({ gameState: { state: "error", error } });
    },

    startRun: () => {
      const gs = get().gameState;
      if (gs.state !== "start") return;
      // Bump the cross-session run counter before the first moment renders
      // so MomentSetup / arcade-mechanic hints can read `runsStarted === 0`
      // exactly once for a brand-new player and never again.
      useProgressionStore.getState().actions.startRun();
      set({
        gameState: {
          state: "moment_setup",
          pack: gs.pack,
          momentIndex: 0,
          strikesRemaining: STARTING_STRIKES,
          runScore: { ...INITIAL_RUN_SCORE },
        },
      });
    },

    beginMoment: () => {
      const gs = get().gameState;
      if (gs.state !== "moment_setup") return;
      const moment = currentMoment(gs.pack, gs.momentIndex);
      if (!moment) {
        set({ gameState: { state: "error", error: "No moment to begin" } });
        return;
      }
      const common = {
        pack: gs.pack,
        momentIndex: gs.momentIndex,
        strikesRemaining: gs.strikesRemaining,
        runScore: gs.runScore,
        actionTaken: false,
      };
      if (moment.momentType === "hitter") {
        set({ gameState: { state: "hitter_gameplay", ...common } });
      } else {
        set({ gameState: { state: "pitcher_gameplay", ...common } });
      }
    },

    submitSwing: (result) => {
      const gs = get().gameState;
      if (gs.state !== "hitter_gameplay" || gs.actionTaken) return;
      set({ gameState: applyResult({ ...gs, actionTaken: true }, result, "hitter") });
    },

    submitPitch: (result) => {
      const gs = get().gameState;
      if (gs.state !== "pitcher_gameplay" || gs.actionTaken) return;
      set({ gameState: applyResult({ ...gs, actionTaken: true }, result, "pitcher") });
    },

    advanceFromReveal: () => {
      const gs = get().gameState;
      if (gs.state !== "reveal") return;
      const nextIndex = gs.momentIndex + 1;
      if (nextIndex >= gs.pack.moments.length) {
        set({
          gameState: {
            state: "run_complete",
            pack: gs.pack,
            runScore: gs.runScore,
          },
        });
        return;
      }
      set({
        gameState: {
          state: "moment_setup",
          pack: gs.pack,
          momentIndex: nextIndex,
          strikesRemaining: gs.strikesRemaining,
          runScore: gs.runScore,
        },
      });
    },

    continueAfterAd: () => {
      const gs = get().gameState;
      if (gs.state !== "ad_break") return;
      set({
        gameState: {
          state: "moment_setup",
          pack: gs.pack,
          momentIndex: gs.momentIndex,
          strikesRemaining: STARTING_STRIKES,
          runScore: gs.runScore,
        },
      });
    },

    reset: () => {
      set({ gameState: INITIAL_STATE });
    },
  },
}));
