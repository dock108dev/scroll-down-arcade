import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RunComplete } from "@/components/RunComplete";
import type { RunScore } from "@/lib/game/stateMachine";
import { useProgressionStore } from "@/stores/progressionStore";

const TODAY = "2026-05-14";

function setProgression(partial: Partial<ReturnType<typeof useProgressionStore.getState>>) {
  useProgressionStore.setState(partial as never);
}

function makeRun(partial: Partial<RunScore> = {}): RunScore {
  return {
    totalPoints: 1500,
    momentsCleared: 4,
    perfectHits: 2,
    strikesUsed: 1,
    ...partial,
  };
}

beforeEach(() => {
  useProgressionStore.getState().actions.reset();
  localStorage.clear();
});

describe("RunComplete — hero score", () => {
  it("renders the totalPoints in text-6xl font-mono with the arcade-accent token", () => {
    render(<RunComplete runScore={makeRun({ totalPoints: 9001 })} today={TODAY} />);
    const score = screen.getByTestId("run-complete-score");
    expect(score.textContent).toBe("9,001");
    expect(score.className).toMatch(/text-6xl/);
    expect(score.className).toMatch(/font-mono/);
    expect(score.className).toMatch(/font-bold/);
    expect(score.className).toMatch(/text-center/);
    expect(score.style.color).toBe("var(--arcade-accent)");
  });
});

describe("RunComplete — primary row (rank + streak)", () => {
  it("renders rank and streak in text-2xl with arcade-text color", () => {
    setProgression({ totalXp: 0, dailyStreak: 0 });
    render(<RunComplete runScore={makeRun({ totalPoints: 100 })} today={TODAY} />);
    const rank = screen.getByTestId("run-complete-rank");
    const streak = screen.getByTestId("run-complete-streak");
    expect(rank.className).toMatch(/text-2xl/);
    expect(rank.className).toMatch(/font-bold/);
    expect(rank.style.color).toBe("var(--arcade-text)");
    expect(streak.className).toMatch(/text-2xl/);
    expect(streak.className).toMatch(/font-bold/);
    expect(streak.style.color).toBe("var(--arcade-text)");
  });

  it("primary row uses a 2-column grid", () => {
    render(<RunComplete runScore={makeRun()} today={TODAY} />);
    const primary = screen.getByTestId("run-complete-primary");
    expect(primary.className).toMatch(/grid-cols-2/);
  });

  it("renders streak from the persisted store after recordRun bumps it", () => {
    setProgression({ dailyStreak: 0, lastPlayedDate: null });
    render(<RunComplete runScore={makeRun()} today={TODAY} />);
    // First run ever → dailyStreak resets to 1
    expect(screen.getByTestId("run-complete-streak").textContent).toContain("1");
  });

  it("pluralises the streak label correctly", () => {
    setProgression({ dailyStreak: 4, lastPlayedDate: "2026-05-13" });
    render(<RunComplete runScore={makeRun()} today={TODAY} />);
    // 4 + 1 (yesterday→today) = 5 days
    expect(screen.getByTestId("run-complete-streak").textContent).toBe(
      "5 days",
    );
  });
});

describe("RunComplete — XP gained line", () => {
  it("renders +XP with the arcade-accent token at text-lg", () => {
    render(<RunComplete runScore={makeRun({ totalPoints: 2345 })} today={TODAY} />);
    const xp = screen.getByTestId("run-complete-xp");
    expect(xp.textContent).toContain("+2,345 XP");
    expect(xp.className).toMatch(/text-lg/);
    expect(xp.style.color).toBe("var(--arcade-accent)");
  });
});

describe("RunComplete — supporting grid (moments / perfect / strikes)", () => {
  it("renders the three supporting stats in a muted 3-column grid at text-sm", () => {
    render(
      <RunComplete
        runScore={makeRun({
          momentsCleared: 4,
          perfectHits: 2,
          strikesUsed: 1,
        })}
        today={TODAY}
      />,
    );
    const grid = screen.getByTestId("run-complete-supporting");
    expect(grid.className).toMatch(/grid-cols-3/);
    expect(grid.className).toMatch(/text-sm/);
    expect(grid.style.color).toBe("var(--arcade-muted)");
    expect(screen.getByTestId("run-complete-moments").textContent).toBe("4");
    expect(screen.getByTestId("run-complete-perfects").textContent).toBe("2");
    expect(screen.getByTestId("run-complete-strikes").textContent).toBe("1");
  });
});

describe("RunComplete — rank-up callout", () => {
  it("does not render the callout when this run did not cross a rank threshold", () => {
    setProgression({ totalXp: 100 }); // Rookie
    render(<RunComplete runScore={makeRun({ totalPoints: 100 })} today={TODAY} />);
    expect(screen.queryByTestId("run-complete-rank-up")).toBeNull();
    expect(
      screen.getByTestId("run-complete").getAttribute("data-rank-up"),
    ).toBe("false");
  });

  it("renders the amber-glow callout when totalXp crosses into a new rank", () => {
    setProgression({ totalXp: 100 }); // start Rookie
    render(
      <RunComplete
        runScore={makeRun({ totalPoints: 1900 })}
        today={TODAY}
      />,
    );
    // 100 + 1900 = 2000 → Pro
    const callout = screen.getByTestId("run-complete-rank-up");
    expect(callout.textContent).toContain("Rookie");
    expect(callout.textContent).toContain("Pro");
    expect(callout.style.borderColor).toBe("");
    // Border declared on `border` shorthand
    expect(callout.style.border).toContain("var(--arcade-accent)");
    expect(callout.style.color).toBe("var(--arcade-accent)");
    expect(callout.className).toMatch(/text-center/);
    expect(callout.className).toMatch(/font-bold/);
    expect(callout.className).toMatch(/rounded-lg/);
    expect(
      screen.getByTestId("run-complete").getAttribute("data-rank-up"),
    ).toBe("true");
  });
});

describe("RunComplete — recordRun side effect", () => {
  it("bumps bestScore on mount when totalPoints exceeds the prior record", () => {
    setProgression({ bestScore: 100 });
    render(<RunComplete runScore={makeRun({ totalPoints: 1500 })} today={TODAY} />);
    expect(useProgressionStore.getState().bestScore).toBe(1500);
  });

  it("does not lower bestScore when this run scored below the record", () => {
    setProgression({ bestScore: 5000 });
    render(<RunComplete runScore={makeRun({ totalPoints: 100 })} today={TODAY} />);
    expect(useProgressionStore.getState().bestScore).toBe(5000);
  });

  it("only records once even if the component re-renders", () => {
    setProgression({ totalXp: 0, momentsCleared: 0 });
    const run = makeRun({ totalPoints: 100, momentsCleared: 3 });
    const { rerender } = render(<RunComplete runScore={run} today={TODAY} />);
    rerender(<RunComplete runScore={run} today={TODAY} />);
    rerender(<RunComplete runScore={run} today={TODAY} />);
    expect(useProgressionStore.getState().totalXp).toBe(100);
    expect(useProgressionStore.getState().momentsCleared).toBe(3);
  });
});

describe("RunComplete — share button", () => {
  it("is styled as a secondary action with arcade-surface bg + arcade-border outline", () => {
    render(<RunComplete runScore={makeRun()} today={TODAY} />);
    const share = screen.getByTestId("run-complete-share");
    expect(share.style.backgroundColor).toBe("var(--arcade-surface)");
    expect(share.style.border).toContain("var(--arcade-border)");
    expect(share.style.color).toBe("var(--arcade-text)");
  });

  it("invokes navigator.share when present", async () => {
    const shareSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: shareSpy,
    });
    render(<RunComplete runScore={makeRun({ totalPoints: 4321 })} today={TODAY} />);
    await userEvent.click(screen.getByTestId("run-complete-share"));
    expect(shareSpy).toHaveBeenCalledTimes(1);
    expect(shareSpy.mock.calls[0]?.[0]?.text).toContain("4,321");
    // Clean up to avoid leaking the spy into other tests.
    delete (navigator as unknown as { share?: unknown }).share;
  });
});
