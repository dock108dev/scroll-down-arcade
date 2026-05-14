import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  computeRank,
  PROGRESSION_STORAGE_KEY,
  PROGRESSION_STORE_VERSION,
  useProgressionStore,
} from "@/stores/progressionStore";

beforeEach(() => {
  useProgressionStore.getState().actions.reset();
  localStorage.clear();
});

describe("progressionStore — initial state", () => {
  it("defaults every field to its zero value", () => {
    const s = useProgressionStore.getState();
    expect(s.totalXp).toBe(0);
    expect(s.dailyStreak).toBe(0);
    expect(s.lastPlayedDate).toBeNull();
    expect(s.bestScore).toBe(0);
    expect(s.perfectHitsAllTime).toBe(0);
    expect(s.momentsCleared).toBe(0);
    expect(s.runsStarted).toBe(0);
  });

  it("runsStarted === 0 identifies a first-ever-run player", () => {
    expect(useProgressionStore.getState().runsStarted).toBe(0);
  });
});

describe("progressionStore — startRun", () => {
  it("increments runsStarted by exactly 1 per call", () => {
    const { actions } = useProgressionStore.getState();
    actions.startRun();
    expect(useProgressionStore.getState().runsStarted).toBe(1);
    actions.startRun();
    actions.startRun();
    expect(useProgressionStore.getState().runsStarted).toBe(3);
  });

  it("after startRun a player is no longer first-ever-run", () => {
    expect(useProgressionStore.getState().runsStarted).toBe(0);
    useProgressionStore.getState().actions.startRun();
    expect(useProgressionStore.getState().runsStarted).toBeGreaterThan(0);
  });

  it("does not touch the other progression fields", () => {
    const before = { ...useProgressionStore.getState() };
    useProgressionStore.getState().actions.startRun();
    const after = useProgressionStore.getState();
    expect(after.totalXp).toBe(before.totalXp);
    expect(after.dailyStreak).toBe(before.dailyStreak);
    expect(after.lastPlayedDate).toBe(before.lastPlayedDate);
    expect(after.bestScore).toBe(before.bestScore);
    expect(after.perfectHitsAllTime).toBe(before.perfectHitsAllTime);
    expect(after.momentsCleared).toBe(before.momentsCleared);
  });
});

describe("progressionStore — persistence", () => {
  it("writes runsStarted to localStorage under the canonical key", () => {
    useProgressionStore.getState().actions.startRun();
    useProgressionStore.getState().actions.startRun();
    const raw = localStorage.getItem(PROGRESSION_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!) as {
      state: { runsStarted: number };
      version: number;
    };
    expect(parsed.version).toBe(PROGRESSION_STORE_VERSION);
    expect(parsed.state.runsStarted).toBe(2);
  });

  it("does not persist the actions sub-object", () => {
    useProgressionStore.getState().actions.startRun();
    const raw = localStorage.getItem(PROGRESSION_STORAGE_KEY)!;
    const parsed = JSON.parse(raw) as { state: Record<string, unknown> };
    expect(parsed.state).not.toHaveProperty("actions");
  });

  it("rehydrates runsStarted on a fresh module import (page reload)", async () => {
    useProgressionStore.getState().actions.startRun();
    useProgressionStore.getState().actions.startRun();
    useProgressionStore.getState().actions.startRun();
    expect(useProgressionStore.getState().runsStarted).toBe(3);

    vi.resetModules();
    const fresh = await import("@/stores/progressionStore");
    // Persist middleware hydrates synchronously from localStorage when the
    // store module is re-evaluated.
    expect(fresh.useProgressionStore.getState().runsStarted).toBe(3);
  });
});

describe("progressionStore — migrate", () => {
  it("backfills runsStarted=0 when v0 data omitted the field", async () => {
    const v0 = {
      state: {
        totalXp: 420,
        dailyStreak: 3,
        lastPlayedDate: "2026-05-13",
        bestScore: 1100,
        perfectHitsAllTime: 7,
        momentsCleared: 12,
        // runsStarted intentionally absent — pre-v1 schema.
      },
      version: 0,
    };
    localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(v0));

    vi.resetModules();
    const fresh = await import("@/stores/progressionStore");
    const s = fresh.useProgressionStore.getState();
    expect(s.runsStarted).toBe(0);
    // Sanity-check that the rest of the v0 payload survived migration.
    expect(s.totalXp).toBe(420);
    expect(s.dailyStreak).toBe(3);
    expect(s.lastPlayedDate).toBe("2026-05-13");
    expect(s.bestScore).toBe(1100);
    expect(s.perfectHitsAllTime).toBe(7);
    expect(s.momentsCleared).toBe(12);
  });

  it("falls back to defaults when persisted blob is malformed", async () => {
    const garbage = {
      state: { totalXp: "not-a-number", lastPlayedDate: 42 },
      version: 0,
    };
    localStorage.setItem(PROGRESSION_STORAGE_KEY, JSON.stringify(garbage));

    vi.resetModules();
    const fresh = await import("@/stores/progressionStore");
    const s = fresh.useProgressionStore.getState();
    expect(s.totalXp).toBe(0);
    expect(s.lastPlayedDate).toBeNull();
    expect(s.runsStarted).toBe(0);
  });
});

describe("progressionStore — recordRun", () => {
  it("recordRun bumps bestScore only when totalPoints exceeds the prior record", () => {
    useProgressionStore.setState({ bestScore: 500 } as never);
    useProgressionStore.getState().actions.recordRun(
      { totalPoints: 100, momentsCleared: 0, perfectHits: 0, strikesUsed: 0 },
      "2026-05-14",
    );
    expect(useProgressionStore.getState().bestScore).toBe(500);
    useProgressionStore.getState().actions.recordRun(
      { totalPoints: 999, momentsCleared: 0, perfectHits: 0, strikesUsed: 0 },
      "2026-05-15",
    );
    expect(useProgressionStore.getState().bestScore).toBe(999);
  });

  it("recordRun adds the run totals to lifetime XP / moments / perfect counts", () => {
    useProgressionStore.setState({
      totalXp: 100,
      momentsCleared: 5,
      perfectHitsAllTime: 2,
    } as never);
    useProgressionStore.getState().actions.recordRun(
      { totalPoints: 250, momentsCleared: 3, perfectHits: 1, strikesUsed: 1 },
      "2026-05-14",
    );
    const s = useProgressionStore.getState();
    expect(s.totalXp).toBe(350);
    expect(s.momentsCleared).toBe(8);
    expect(s.perfectHitsAllTime).toBe(3);
  });

  it("recordRun resets the streak to 1 for a first-ever run", () => {
    useProgressionStore.getState().actions.recordRun(
      { totalPoints: 100, momentsCleared: 0, perfectHits: 0, strikesUsed: 0 },
      "2026-05-14",
    );
    expect(useProgressionStore.getState().dailyStreak).toBe(1);
    expect(useProgressionStore.getState().lastPlayedDate).toBe("2026-05-14");
  });

  it("recordRun extends the streak when yesterday is the prior play date", () => {
    useProgressionStore.setState({
      dailyStreak: 3,
      lastPlayedDate: "2026-05-13",
    } as never);
    useProgressionStore.getState().actions.recordRun(
      { totalPoints: 100, momentsCleared: 0, perfectHits: 0, strikesUsed: 0 },
      "2026-05-14",
    );
    expect(useProgressionStore.getState().dailyStreak).toBe(4);
  });

  it("recordRun restarts the streak at 1 when a day was missed", () => {
    useProgressionStore.setState({
      dailyStreak: 7,
      lastPlayedDate: "2026-05-10",
    } as never);
    useProgressionStore.getState().actions.recordRun(
      { totalPoints: 100, momentsCleared: 0, perfectHits: 0, strikesUsed: 0 },
      "2026-05-14",
    );
    expect(useProgressionStore.getState().dailyStreak).toBe(1);
  });

  it("recordRun keeps the streak unchanged when called twice on the same day", () => {
    useProgressionStore.setState({
      dailyStreak: 2,
      lastPlayedDate: "2026-05-13",
    } as never);
    useProgressionStore.getState().actions.recordRun(
      { totalPoints: 100, momentsCleared: 0, perfectHits: 0, strikesUsed: 0 },
      "2026-05-14",
    );
    expect(useProgressionStore.getState().dailyStreak).toBe(3);
    // Same-day re-record (e.g. remount under StrictMode) must not double-count.
    useProgressionStore.getState().actions.recordRun(
      { totalPoints: 100, momentsCleared: 0, perfectHits: 0, strikesUsed: 0 },
      "2026-05-14",
    );
    expect(useProgressionStore.getState().dailyStreak).toBe(3);
  });
});

describe("progressionStore — computeRank", () => {
  it.each<[number, string]>([
    [0, "Rookie"],
    [499, "Rookie"],
    [500, "Contender"],
    [1999, "Contender"],
    [2000, "Pro"],
    [4999, "Pro"],
    [5000, "All-Star"],
    [14999, "All-Star"],
    [15000, "MVP"],
    [49999, "MVP"],
    [50000, "Hall of Fame"],
    [999999, "Hall of Fame"],
  ])("computeRank(%i) → %s", (xp, label) => {
    expect(computeRank(xp).label).toBe(label);
  });

  it("returns monotonically non-decreasing tiers as XP grows", () => {
    const samples = [0, 250, 750, 2500, 7000, 20000, 100000];
    const tiers = samples.map((xp) => computeRank(xp).tier);
    for (let i = 1; i < tiers.length; i++) {
      expect(tiers[i]).toBeGreaterThanOrEqual(tiers[i - 1]);
    }
  });
});

