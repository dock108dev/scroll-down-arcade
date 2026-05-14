import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DailyRun } from "@/components/DailyRun";
import fixtureRaw from "@/lib/fixtures/dailyPressurePack.sample.json";
import type { ArcadeDailyPressurePack } from "@/lib/api/types";
import { useGameStore } from "@/lib/game/stateMachine";
import { useProgressionStore } from "@/stores/progressionStore";

const samplePack = fixtureRaw as ArcadeDailyPressurePack;

// The fixture only ships 2 moments; an ad break requires 3 strike-costing
// outcomes before the run completes, so we widen the pack by repeating
// moments. This is a test-only construction and does not touch any
// production code path.
function widePack(): ArcadeDailyPressurePack {
  const hitter = samplePack.moments.find((m) => m.momentType === "hitter")!;
  return {
    ...samplePack,
    moments: [hitter, hitter, hitter, hitter],
  };
}

beforeEach(() => {
  useGameStore.getState().actions.reset();
  useProgressionStore.getState().actions.reset();
  localStorage.clear();
  vi.restoreAllMocks();
  // Pin a never-resolving default for the BFF fetch so tests that don't
  // explicitly drive the network path don't race a real-ish state update
  // against the assertion. Tests that need a real response override this.
  vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
});

describe("DailyRun — state routing", () => {
  it("renders the loading shell in the initial state", () => {
    render(<DailyRun initialPack={undefined} />);
    expect(screen.getByTestId("loading-pack")).toBeTruthy();
  });

  it("loads the initialPack prop and shows the StartScreen", () => {
    render(<DailyRun initialPack={samplePack} />);
    expect(screen.getByTestId("start-screen")).toBeTruthy();
  });

  it("StartScreen CTA transitions to moment_setup with full chrome", async () => {
    render(<DailyRun initialPack={samplePack} today="2026-05-14" />);
    await userEvent.click(screen.getByTestId("start-cta"));
    expect(screen.getByTestId("scoreboard")).toBeTruthy();
    expect(screen.getByTestId("strike-counter")).toBeTruthy();
    expect(screen.getByTestId("moment-setup")).toBeTruthy();
  });

  it("renders the ad break modal when the state machine enters ad_break", () => {
    const pack = widePack();
    render(<DailyRun initialPack={pack} today="2026-05-14" />);
    const { actions } = useGameStore.getState();
    act(() => {
      actions.startRun();
      // Drain three strikes on three different moments. After each
      // non-final miss the reveal needs an explicit advance so the next
      // beginMoment lands on the next index.
      actions.beginMoment();
      actions.submitSwing("miss");
      actions.advanceFromReveal();
      actions.beginMoment();
      actions.submitSwing("miss");
      actions.advanceFromReveal();
      actions.beginMoment();
      actions.submitSwing("miss");
    });
    expect(useGameStore.getState().gameState.state).toBe("ad_break");
    expect(screen.getByTestId("ad-break-modal")).toBeTruthy();
  });

  it("Continue button in ad break returns the player to moment_setup with fresh strikes", async () => {
    const pack = widePack();
    render(<DailyRun initialPack={pack} today="2026-05-14" />);
    const { actions } = useGameStore.getState();
    act(() => {
      actions.startRun();
      actions.beginMoment();
      actions.submitSwing("miss");
      actions.advanceFromReveal();
      actions.beginMoment();
      actions.submitSwing("miss");
      actions.advanceFromReveal();
      actions.beginMoment();
      actions.submitSwing("miss");
    });
    expect(useGameStore.getState().gameState.state).toBe("ad_break");
    await userEvent.click(screen.getByTestId("ad-continue"));
    const after = useGameStore.getState().gameState;
    expect(after.state).toBe("moment_setup");
    if (after.state === "moment_setup") {
      expect(after.strikesRemaining).toBe(3);
    }
  });

  it("renders the off-day card when the BFF reports no_pack", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            date: "2026-05-14",
            detail: "No scheduled games",
          }),
          { status: 404, headers: { "content-type": "application/json" } },
        ),
      );
    render(<DailyRun />);
    await screen.findByTestId("off-day");
    expect(screen.getByTestId("off-day-date").textContent).toBe("2026-05-14");
    expect(screen.getByText(/No scheduled games/)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces a fetch error in the error state when transport fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));
    render(<DailyRun />);
    await screen.findByTestId("error-state");
    expect(screen.getByTestId("error-state").textContent).toContain("offline");
  });
});
