import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { StartScreen } from "@/components/StartScreen";
import type { ArcadeDailyPressurePack } from "@/lib/api/types";
import { useProgressionStore } from "@/stores/progressionStore";

const PACK: ArcadeDailyPressurePack = {
  date: "2026-05-14",
  title: "Daily MLB Pressure Run",
  subtitle: "5 moments from yesterday's biggest games",
  moments: [],
};

const TODAY = "2026-05-14";

function setProgression(partial: Partial<ReturnType<typeof useProgressionStore.getState>>) {
  // The progression store keeps `actions` alongside data. Spread the
  // partial directly so we can pin individual fields per test without
  // clobbering the store's action closures.
  useProgressionStore.setState(partial as never);
}

beforeEach(() => {
  useProgressionStore.getState().actions.reset();
  localStorage.clear();
});

describe("StartScreen — first-ever run", () => {
  it("hides the personal best line when runsStarted === 0", () => {
    setProgression({ runsStarted: 0, bestScore: 5000 });
    render(<StartScreen pack={PACK} onStart={() => {}} today={TODAY} />);
    expect(screen.queryByTestId("personal-best")).toBeNull();
  });

  it("hides the streak badge on first-ever run", () => {
    setProgression({ runsStarted: 0, dailyStreak: 0 });
    render(<StartScreen pack={PACK} onStart={() => {}} today={TODAY} />);
    expect(screen.queryByTestId("streak-badge")).toBeNull();
  });

  it("renders a clean first-time CTA copy", () => {
    setProgression({ runsStarted: 0 });
    render(<StartScreen pack={PACK} onStart={() => {}} today={TODAY} />);
    const cta = screen.getByTestId("start-cta");
    expect(cta.textContent).toBe("Start Daily Run");
  });
});

describe("StartScreen — returning player personal best", () => {
  it("shows 'Personal best: N pts' in amber when runsStarted >= 1 and bestScore > 0", () => {
    setProgression({ runsStarted: 1, bestScore: 1234 });
    render(<StartScreen pack={PACK} onStart={() => {}} today={TODAY} />);
    const pb = screen.getByTestId("personal-best");
    expect(pb.textContent).toContain("Personal best:");
    const amber = pb.querySelector("span");
    expect(amber).not.toBeNull();
    expect((amber as HTMLElement).style.color).toBe("var(--arcade-accent)");
    expect((amber as HTMLElement).className).toMatch(/font-bold/);
  });

  it("formats the score with toLocaleString — 1234 renders as '1,234'", () => {
    setProgression({ runsStarted: 2, bestScore: 1234 });
    render(<StartScreen pack={PACK} onStart={() => {}} today={TODAY} />);
    const pb = screen.getByTestId("personal-best");
    expect(pb.textContent).toContain("1,234 pts");
  });

  it("hides personal best when bestScore is 0 even for returning players", () => {
    setProgression({ runsStarted: 5, bestScore: 0 });
    render(<StartScreen pack={PACK} onStart={() => {}} today={TODAY} />);
    expect(screen.queryByTestId("personal-best")).toBeNull();
  });

  it("re-renders the personal best when bestScore is bumped (RunComplete recordRun)", () => {
    setProgression({ runsStarted: 1, bestScore: 100 });
    render(<StartScreen pack={PACK} onStart={() => {}} today={TODAY} />);
    expect(screen.getByTestId("personal-best").textContent).toContain("100 pts");
    act(() => {
      useProgressionStore.setState({ bestScore: 9001 } as never);
    });
    expect(screen.getByTestId("personal-best").textContent).toContain(
      "9,001 pts",
    );
  });

  it("renders the streak badge above the personal best when both are present", () => {
    setProgression({ runsStarted: 3, bestScore: 500, dailyStreak: 4 });
    render(<StartScreen pack={PACK} onStart={() => {}} today={TODAY} />);
    const streak = screen.getByTestId("streak-badge");
    const pb = screen.getByTestId("personal-best");
    expect(streak.textContent).toContain("Streak:");
    // Document order: streak badge precedes personal best (above CTA).
    const order = streak.compareDocumentPosition(pb);
    expect(order & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const cta = screen.getByTestId("start-cta");
    const orderToCta = pb.compareDocumentPosition(cta);
    expect(orderToCta & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("StartScreen — already-played-today state", () => {
  it("hides the personal best line when lastPlayedDate === today", () => {
    setProgression({
      runsStarted: 7,
      bestScore: 8800,
      lastPlayedDate: TODAY,
      dailyStreak: 3,
    });
    render(<StartScreen pack={PACK} onStart={() => {}} today={TODAY} />);
    expect(screen.queryByTestId("personal-best")).toBeNull();
    expect(screen.getByTestId("already-played-block")).toBeTruthy();
  });

  it("surfaces the streak inside the already-played message when streak > 0", () => {
    setProgression({
      runsStarted: 2,
      bestScore: 0,
      lastPlayedDate: TODAY,
      dailyStreak: 5,
    });
    render(<StartScreen pack={PACK} onStart={() => {}} today={TODAY} />);
    const streakLine = screen.getByTestId("already-played-streak");
    expect(streakLine.textContent).toContain("5");
  });

  it("does not render the start CTA when already played", () => {
    setProgression({
      runsStarted: 1,
      lastPlayedDate: TODAY,
    });
    render(<StartScreen pack={PACK} onStart={() => {}} today={TODAY} />);
    expect(screen.queryByTestId("start-cta")).toBeNull();
  });

  it("does NOT activate the already-played branch on a stale lastPlayedDate", () => {
    setProgression({
      runsStarted: 1,
      bestScore: 1000,
      lastPlayedDate: "2026-05-13",
    });
    render(<StartScreen pack={PACK} onStart={() => {}} today={TODAY} />);
    expect(screen.queryByTestId("already-played-block")).toBeNull();
    expect(screen.getByTestId("personal-best").textContent).toContain(
      "1,000 pts",
    );
  });
});

describe("StartScreen — CTA wiring", () => {
  it("invokes onStart when the CTA is clicked", async () => {
    const onStart = vi.fn();
    setProgression({ runsStarted: 0 });
    render(<StartScreen pack={PACK} onStart={onStart} today={TODAY} />);
    await userEvent.click(screen.getByTestId("start-cta"));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
