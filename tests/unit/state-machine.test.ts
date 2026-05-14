import { describe, it, expect, beforeEach, vi } from "vitest";

import fixtureRaw from "@/lib/fixtures/dailyPressurePack.sample.json";
import type { ArcadeDailyPressurePack } from "@/lib/api/types";
import {
  STARTING_STRIKES,
  useGameStore,
} from "@/lib/game/stateMachine";
import { useProgressionStore } from "@/stores/progressionStore";

const samplePack = fixtureRaw as ArcadeDailyPressurePack;

const hitterRank = samplePack.moments.find((m) => m.momentType === "hitter")!;
const pitcherRank = samplePack.moments.find((m) => m.momentType === "pitcher")!;

function loadAndStart(): void {
  const { actions } = useGameStore.getState();
  actions.loadPack(samplePack);
  actions.startRun();
}

beforeEach(() => {
  useGameStore.getState().actions.reset();
  useProgressionStore.getState().actions.reset();
  localStorage.clear();
});

describe("stateMachine — initialization", () => {
  it("starts in loading_daily_pack", () => {
    expect(useGameStore.getState().gameState.state).toBe("loading_daily_pack");
  });

  it("does not write the game state to localStorage on transitions", () => {
    const { actions } = useGameStore.getState();
    actions.loadPack(samplePack);
    actions.startRun();
    actions.beginMoment();
    actions.submitSwing("perfect");
    // The progression store legitimately persists `runsStarted` etc., but
    // no key may contain transient game-state markers like the pack or the
    // gameplay sub-state names — those would mean a refresh could resume
    // mid-run, which the design forbids.
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      const value = localStorage.getItem(key) ?? "";
      expect(value).not.toContain("hitter_gameplay");
      expect(value).not.toContain("pitcher_gameplay");
      expect(value).not.toContain("moment_setup");
      expect(value).not.toContain("loading_daily_pack");
      expect(value).not.toContain("actionTaken");
    }
  });

  it("re-importing the module produces a fresh loading_daily_pack store (page refresh)", async () => {
    const { actions } = useGameStore.getState();
    actions.loadPack(samplePack);
    actions.startRun();
    expect(useGameStore.getState().gameState.state).toBe("moment_setup");

    vi.resetModules();
    const fresh = await import("@/lib/game/stateMachine");
    expect(fresh.useGameStore.getState().gameState.state).toBe(
      "loading_daily_pack",
    );
  });
});

describe("stateMachine — flow transitions", () => {
  it("loadPack → start; startRun → moment_setup with fresh score and strikes", () => {
    const { actions } = useGameStore.getState();
    actions.loadPack(samplePack);
    const startState = useGameStore.getState().gameState;
    expect(startState.state).toBe("start");

    actions.startRun();
    const ms = useGameStore.getState().gameState;
    expect(ms.state).toBe("moment_setup");
    if (ms.state !== "moment_setup") throw new Error("narrow");
    expect(ms.momentIndex).toBe(0);
    expect(ms.strikesRemaining).toBe(STARTING_STRIKES);
    expect(ms.runScore.totalPoints).toBe(0);
    expect(ms.runScore.strikesUsed).toBe(0);
  });

  it("beginMoment routes to hitter_gameplay for hitter moments", () => {
    const hitterPack: ArcadeDailyPressurePack = {
      ...samplePack,
      moments: [hitterRank],
    };
    const { actions } = useGameStore.getState();
    actions.loadPack(hitterPack);
    actions.startRun();
    actions.beginMoment();
    const gs = useGameStore.getState().gameState;
    expect(gs.state).toBe("hitter_gameplay");
    if (gs.state !== "hitter_gameplay") throw new Error("narrow");
    expect(gs.actionTaken).toBe(false);
  });

  it("beginMoment routes to pitcher_gameplay for pitcher moments", () => {
    const pitcherPack: ArcadeDailyPressurePack = {
      ...samplePack,
      moments: [pitcherRank],
    };
    const { actions } = useGameStore.getState();
    actions.loadPack(pitcherPack);
    actions.startRun();
    actions.beginMoment();
    const gs = useGameStore.getState().gameState;
    expect(gs.state).toBe("pitcher_gameplay");
    if (gs.state !== "pitcher_gameplay") throw new Error("narrow");
    expect(gs.actionTaken).toBe(false);
  });

  it("non-strike swing transitions hitter_gameplay → reveal, preserves strikes", () => {
    const hitterPack: ArcadeDailyPressurePack = {
      ...samplePack,
      moments: [hitterRank],
    };
    const { actions } = useGameStore.getState();
    actions.loadPack(hitterPack);
    actions.startRun();
    actions.beginMoment();
    actions.submitSwing("perfect");
    const gs = useGameStore.getState().gameState;
    expect(gs.state).toBe("reveal");
    if (gs.state !== "reveal") throw new Error("narrow");
    expect(gs.strikesRemaining).toBe(STARTING_STRIKES);
    expect(gs.runScore.strikesUsed).toBe(0);
    expect(gs.runScore.totalPoints).toBeGreaterThan(0);
    expect(gs.runScore.perfectHits).toBe(1);
    expect(gs.runScore.momentsCleared).toBe(1);
    expect(gs.lastOutcome.result).toBe("perfect");
    expect(gs.lastOutcome.lostStrike).toBe(false);
  });

  it("miss costs a strike and stays out of ad_break while strikes remain", () => {
    const hitterPack: ArcadeDailyPressurePack = {
      ...samplePack,
      moments: [hitterRank],
    };
    const { actions } = useGameStore.getState();
    actions.loadPack(hitterPack);
    actions.startRun();
    actions.beginMoment();
    actions.submitSwing("miss");
    const gs = useGameStore.getState().gameState;
    expect(gs.state).toBe("reveal");
    if (gs.state !== "reveal") throw new Error("narrow");
    expect(gs.strikesRemaining).toBe(STARTING_STRIKES - 1);
    expect(gs.runScore.strikesUsed).toBe(1);
    expect(gs.runScore.totalPoints).toBe(0);
    expect(gs.runScore.momentsCleared).toBe(0);
  });
});

describe("stateMachine — one action per moment guard", () => {
  it("double-tap submitSwing does not decrement strikesRemaining twice", () => {
    const hitterPack: ArcadeDailyPressurePack = {
      ...samplePack,
      moments: [hitterRank],
    };
    const { actions } = useGameStore.getState();
    actions.loadPack(hitterPack);
    actions.startRun();
    actions.beginMoment();
    actions.submitSwing("miss");
    actions.submitSwing("miss");
    const gs = useGameStore.getState().gameState;
    if (gs.state !== "reveal") throw new Error("expected reveal");
    expect(gs.strikesRemaining).toBe(STARTING_STRIKES - 1);
    expect(gs.runScore.strikesUsed).toBe(1);
  });

  it("double-tap submitPitch does not decrement strikesRemaining twice", () => {
    const pitcherPack: ArcadeDailyPressurePack = {
      ...samplePack,
      moments: [pitcherRank],
    };
    const { actions } = useGameStore.getState();
    actions.loadPack(pitcherPack);
    actions.startRun();
    actions.beginMoment();
    actions.submitPitch("hanger");
    actions.submitPitch("hanger");
    const gs = useGameStore.getState().gameState;
    if (gs.state !== "reveal") throw new Error("expected reveal");
    expect(gs.strikesRemaining).toBe(STARTING_STRIKES - 1);
    expect(gs.runScore.strikesUsed).toBe(1);
  });

  it("submitSwing is a no-op when called from a non-gameplay state", () => {
    loadAndStart();
    const before = useGameStore.getState().gameState;
    useGameStore.getState().actions.submitSwing("perfect");
    const after = useGameStore.getState().gameState;
    expect(after).toEqual(before);
  });
});

describe("stateMachine — ad break and continue", () => {
  it("third strike from full-strike state transitions to ad_break", () => {
    const hitterPack: ArcadeDailyPressurePack = {
      ...samplePack,
      moments: [hitterRank, hitterRank, hitterRank, hitterRank],
    };
    const { actions } = useGameStore.getState();
    actions.loadPack(hitterPack);
    actions.startRun();

    // Three sequential misses — last one drains strikes to 0.
    actions.beginMoment();
    actions.submitSwing("miss");
    actions.advanceFromReveal();
    actions.beginMoment();
    actions.submitSwing("miss");
    actions.advanceFromReveal();
    actions.beginMoment();
    actions.submitSwing("miss");

    const gs = useGameStore.getState().gameState;
    expect(gs.state).toBe("ad_break");
    if (gs.state !== "ad_break") throw new Error("narrow");
    expect(gs.runScore.strikesUsed).toBe(3);
    expect(gs.momentIndex).toBe(2);
  });

  it("continueAfterAd resets strikesRemaining to 3 at the same momentIndex", () => {
    const hitterPack: ArcadeDailyPressurePack = {
      ...samplePack,
      moments: [hitterRank, hitterRank, hitterRank, hitterRank],
    };
    const { actions } = useGameStore.getState();
    actions.loadPack(hitterPack);
    actions.startRun();
    actions.beginMoment();
    actions.submitSwing("miss");
    actions.advanceFromReveal();
    actions.beginMoment();
    actions.submitSwing("miss");
    actions.advanceFromReveal();
    actions.beginMoment();
    actions.submitSwing("miss");
    expect(useGameStore.getState().gameState.state).toBe("ad_break");

    actions.continueAfterAd();
    const gs = useGameStore.getState().gameState;
    expect(gs.state).toBe("moment_setup");
    if (gs.state !== "moment_setup") throw new Error("narrow");
    expect(gs.strikesRemaining).toBe(STARTING_STRIKES);
    expect(gs.momentIndex).toBe(2);
    expect(gs.runScore.strikesUsed).toBe(3);
  });
});

describe("stateMachine — completing a run", () => {
  it("advanceFromReveal on the final moment transitions to run_complete", () => {
    const singlePack: ArcadeDailyPressurePack = {
      ...samplePack,
      moments: [hitterRank],
    };
    const { actions } = useGameStore.getState();
    actions.loadPack(singlePack);
    actions.startRun();
    actions.beginMoment();
    actions.submitSwing("perfect");
    actions.advanceFromReveal();
    const gs = useGameStore.getState().gameState;
    expect(gs.state).toBe("run_complete");
    if (gs.state !== "run_complete") throw new Error("narrow");
    expect(gs.runScore.perfectHits).toBe(1);
    expect(gs.runScore.momentsCleared).toBe(1);
  });

  it("advances through a multi-moment pack and lands on run_complete", () => {
    const { actions } = useGameStore.getState();
    actions.loadPack(samplePack);
    actions.startRun();

    for (let i = 0; i < samplePack.moments.length; i++) {
      actions.beginMoment();
      const moment = samplePack.moments[i];
      if (moment.momentType === "hitter") {
        actions.submitSwing("good");
      } else {
        actions.submitPitch("good_pitch");
      }
      actions.advanceFromReveal();
    }
    const gs = useGameStore.getState().gameState;
    expect(gs.state).toBe("run_complete");
    if (gs.state !== "run_complete") throw new Error("narrow");
    expect(gs.runScore.momentsCleared).toBe(samplePack.moments.length);
  });
});

describe("stateMachine — progression integration", () => {
  it("startRun increments the persisted runsStarted counter", () => {
    expect(useProgressionStore.getState().runsStarted).toBe(0);
    const { actions } = useGameStore.getState();
    actions.loadPack(samplePack);
    actions.startRun();
    expect(useProgressionStore.getState().runsStarted).toBe(1);
  });

  it("startRun no-op outside `start` does not bump runsStarted", () => {
    expect(useProgressionStore.getState().runsStarted).toBe(0);
    useGameStore.getState().actions.startRun();
    expect(useProgressionStore.getState().runsStarted).toBe(0);
  });
});

describe("stateMachine — error handling", () => {
  it("failLoad transitions to error with the provided message", () => {
    const { actions } = useGameStore.getState();
    actions.failLoad("upstream unavailable");
    const gs = useGameStore.getState().gameState;
    expect(gs.state).toBe("error");
    if (gs.state !== "error") throw new Error("narrow");
    expect(gs.error).toBe("upstream unavailable");
  });

  it("startRun is a no-op outside the start state", () => {
    const { actions } = useGameStore.getState();
    expect(useGameStore.getState().gameState.state).toBe("loading_daily_pack");
    actions.startRun();
    expect(useGameStore.getState().gameState.state).toBe("loading_daily_pack");
  });
});
