/**
 * Player progression store — persisted to localStorage.
 *
 * Survives page reloads so daily-streak, lifetime XP, and "first ever run"
 * gating work across sessions. The transient run state lives in
 * `useGameStore` (see `src/lib/game/stateMachine.ts`) and is intentionally
 * NOT persisted; this store owns only the cross-session totals.
 *
 * `runsStarted` is bumped from the game state machine's `startRun`
 * transition so MomentSetup / HitterArcade / PitcherArcade can detect
 * `runsStarted === 0` and show first-run mechanic hints. Because the bump
 * happens before the first moment renders, the very first MomentSetup of a
 * brand-new player still sees `runsStarted === 0` only if it reads the
 * value *before* invoking `startRun`; after the transition the counter is
 * `>= 1` and hints stay suppressed for the rest of that run and forever.
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface ProgressionState {
  totalXp: number;
  dailyStreak: number;
  lastPlayedDate: string | null;
  bestScore: number;
  perfectHitsAllTime: number;
  momentsCleared: number;
  runsStarted: number;
}

export interface RunSummary {
  totalPoints: number;
  momentsCleared: number;
  perfectHits: number;
  strikesUsed: number;
}

export interface ProgressionActions {
  /** Bump `runsStarted`. Called by the game state machine on `startRun`. */
  startRun: () => void;
  /**
   * Commit a finished run into long-term progression. Called exactly once
   * from `RunComplete` on mount: bumps `totalXp`, `perfectHitsAllTime`,
   * `momentsCleared`; raises `bestScore` if this run beat the prior record;
   * advances `dailyStreak` (continued / reset / unchanged based on the gap
   * between `lastPlayedDate` and `today`); stamps `lastPlayedDate = today`.
   * `today` is an ISO date `YYYY-MM-DD` so the dependency on a real clock
   * stays at the call site.
   */
  recordRun: (run: RunSummary, today: string) => void;
  /** Reset every field to its initial value. Test/debug utility. */
  reset: () => void;
}

export interface RankInfo {
  /** Zero-based tier index — higher is better. */
  tier: number;
  /** Display label for this rank (e.g. "All-Star"). */
  label: string;
}

const RANK_THRESHOLDS: ReadonlyArray<{ minXp: number; label: string }> = [
  { minXp: 0, label: "Rookie" },
  { minXp: 500, label: "Contender" },
  { minXp: 2000, label: "Pro" },
  { minXp: 5000, label: "All-Star" },
  { minXp: 15000, label: "MVP" },
  { minXp: 50000, label: "Hall of Fame" },
];

/** Map a lifetime XP total onto its rank tier + label. */
export function computeRank(totalXp: number): RankInfo {
  let tier = 0;
  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= RANK_THRESHOLDS[i].minXp) {
      tier = i;
      break;
    }
  }
  return { tier, label: RANK_THRESHOLDS[tier].label };
}

function previousIsoDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

type Store = ProgressionState & { actions: ProgressionActions };

export const PROGRESSION_STORAGE_KEY = "scroll-down-arcade:progression";
export const PROGRESSION_STORE_VERSION = 1;

const INITIAL: ProgressionState = {
  totalXp: 0,
  dailyStreak: 0,
  lastPlayedDate: null,
  bestScore: 0,
  perfectHitsAllTime: 0,
  momentsCleared: 0,
  runsStarted: 0,
};

function coerceState(raw: unknown): ProgressionState {
  const src = (raw ?? {}) as Partial<Record<keyof ProgressionState, unknown>>;
  const num = (v: unknown, fallback: number): number =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;
  return {
    totalXp: num(src.totalXp, INITIAL.totalXp),
    dailyStreak: num(src.dailyStreak, INITIAL.dailyStreak),
    lastPlayedDate:
      typeof src.lastPlayedDate === "string" ? src.lastPlayedDate : null,
    bestScore: num(src.bestScore, INITIAL.bestScore),
    perfectHitsAllTime: num(
      src.perfectHitsAllTime,
      INITIAL.perfectHitsAllTime,
    ),
    momentsCleared: num(src.momentsCleared, INITIAL.momentsCleared),
    runsStarted: num(src.runsStarted, INITIAL.runsStarted),
  };
}

export const useProgressionStore = create<Store>()(
  persist(
    (set) => ({
      ...INITIAL,
      actions: {
        startRun: () => {
          set((s) => ({ runsStarted: s.runsStarted + 1 }));
        },
        recordRun: (run, today) => {
          set((s) => {
            // Streak rule: same day → unchanged (idempotent if the screen
            // re-mounts); contiguous (yesterday → today) → +1; any other gap
            // (including the very first run) → restart at 1.
            let nextStreak: number;
            if (s.lastPlayedDate === today) {
              nextStreak = s.dailyStreak;
            } else if (s.lastPlayedDate === previousIsoDate(today)) {
              nextStreak = s.dailyStreak + 1;
            } else {
              nextStreak = 1;
            }
            return {
              bestScore: Math.max(s.bestScore, run.totalPoints),
              totalXp: s.totalXp + run.totalPoints,
              perfectHitsAllTime: s.perfectHitsAllTime + run.perfectHits,
              momentsCleared: s.momentsCleared + run.momentsCleared,
              dailyStreak: nextStreak,
              lastPlayedDate: today,
            };
          });
        },
        reset: () => {
          set({ ...INITIAL });
        },
      },
    }),
    {
      name: PROGRESSION_STORAGE_KEY,
      version: PROGRESSION_STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      // Persist only the data fields. Actions are recreated on init and
      // would otherwise serialise as `{}` and shadow the live closures.
      partialize: (s) => ({
        totalXp: s.totalXp,
        dailyStreak: s.dailyStreak,
        lastPlayedDate: s.lastPlayedDate,
        bestScore: s.bestScore,
        perfectHitsAllTime: s.perfectHitsAllTime,
        momentsCleared: s.momentsCleared,
        runsStarted: s.runsStarted,
      }),
      // v0 → v1 added `runsStarted`. Coerce defensively so any malformed
      // persisted blob (missing fields, wrong types) lands on a clean shape
      // instead of crashing rehydration.
      migrate: (persisted) => coerceState(persisted),
    },
  ),
);
