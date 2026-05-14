import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { PitcherArcade } from "@/components/PitcherArcade";
import type { ArcadePitcherGameplay } from "@/lib/api/types";
import { titleCasePitchType, ZONE_QUADRANTS } from "@/lib/game/timing";

function makeGameplay(
  overrides: Partial<ArcadePitcherGameplay> = {},
): ArcadePitcherGameplay {
  return {
    targetSpeed: 70,
    accuracyWindowMs: 160,
    perfectWindowMs: 55,
    recommendedZone: "low-away",
    visualPitchType: "slider",
    ...overrides,
  };
}

describe("PitcherArcade — visual pitch type label", () => {
  it("renders the visualPitchType title-cased in arcade-accent amber", () => {
    render(<PitcherArcade gameplay={makeGameplay()} onSubmit={() => {}} />);

    const label = screen.getByTestId("pitch-type-label");
    expect(label.textContent).toBe("Slider");
    expect(label.style.color).toBe("var(--arcade-accent)");
    expect(label.className).toMatch(/text-lg/);
    expect(label.className).toMatch(/font-bold/);
  });

  it("renders 'Fastball' for visualPitchType='fastball'", () => {
    render(
      <PitcherArcade
        gameplay={makeGameplay({ visualPitchType: "fastball" })}
        onSubmit={() => {}}
      />,
    );
    expect(screen.getByTestId("pitch-type-label").textContent).toBe("Fastball");
  });

  it("uses muted color and uppercase font-mono for the 'Pitch type' heading", () => {
    render(<PitcherArcade gameplay={makeGameplay()} onSubmit={() => {}} />);
    const heading = screen.getByText("Pitch type");
    expect(heading.style.color).toBe("var(--arcade-muted)");
    expect(heading.className).toMatch(/font-mono/);
    expect(heading.className).toMatch(/uppercase/);
    expect(heading.className).toMatch(/tracking-widest/);
  });

  it("keeps the label mounted across both targeting and release phases", async () => {
    const user = userEvent.setup();
    render(<PitcherArcade gameplay={makeGameplay()} onSubmit={() => {}} />);

    expect(
      screen.getByTestId("pitcher-arcade").getAttribute("data-phase"),
    ).toBe("targeting");
    expect(screen.getByTestId("pitch-type-label").textContent).toBe("Slider");

    await user.click(screen.getByTestId("zone-low-away"));

    expect(
      screen.getByTestId("pitcher-arcade").getAttribute("data-phase"),
    ).toBe("release");
    expect(screen.getByTestId("pitch-type-label").textContent).toBe("Slider");
  });

  it("renders the pitch-type block above the zone grid in DOM order", () => {
    render(<PitcherArcade gameplay={makeGameplay()} onSubmit={() => {}} />);
    const root = screen.getByTestId("pitcher-arcade");
    const typeBlock = within(root).getByTestId("pitch-type-block");
    const grid = within(root).getByTestId("zone-grid");
    // The pitch-type block must precede the zone grid so they cannot overlap.
    expect(
      typeBlock.compareDocumentPosition(grid) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders the pitch-type block above the release meter in DOM order", async () => {
    const user = userEvent.setup();
    render(<PitcherArcade gameplay={makeGameplay()} onSubmit={() => {}} />);
    await user.click(screen.getByTestId("zone-low-away"));

    const root = screen.getByTestId("pitcher-arcade");
    const typeBlock = within(root).getByTestId("pitch-type-block");
    const releaseBlock = within(root).getByTestId("release-block");
    expect(
      typeBlock.compareDocumentPosition(releaseBlock) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe("PitcherArcade — targeting grid", () => {
  it("renders one cell per ZONE_QUADRANTS entry", () => {
    render(<PitcherArcade gameplay={makeGameplay()} onSubmit={() => {}} />);
    for (const zone of ZONE_QUADRANTS) {
      expect(screen.getByTestId(`zone-${zone}`)).toBeInTheDocument();
    }
  });

  it("marks the recommendedZone cell with a recommendation data attribute", () => {
    render(
      <PitcherArcade
        gameplay={makeGameplay({ recommendedZone: "up-in" })}
        onSubmit={() => {}}
      />,
    );
    expect(
      screen.getByTestId("zone-up-in").getAttribute("data-recommended"),
    ).toBe("true");
    expect(
      screen.getByTestId("zone-low-away").getAttribute("data-recommended"),
    ).toBe("false");
  });

  it("disables every zone cell once a selection has been made", async () => {
    const user = userEvent.setup();
    render(<PitcherArcade gameplay={makeGameplay()} onSubmit={() => {}} />);
    await user.click(screen.getByTestId("zone-middle"));
    for (const zone of ZONE_QUADRANTS) {
      expect(
        (screen.getByTestId(`zone-${zone}`) as HTMLButtonElement).disabled,
      ).toBe(true);
    }
  });
});

describe("PitcherArcade — release phase", () => {
  it("shows the release instruction and meter only after a zone is picked", async () => {
    const user = userEvent.setup();
    render(<PitcherArcade gameplay={makeGameplay()} onSubmit={() => {}} />);

    expect(screen.queryByTestId("release-meter")).toBeNull();
    await user.click(screen.getByTestId("zone-low-away"));
    expect(screen.getByTestId("release-meter")).toBeInTheDocument();
    expect(screen.getByTestId("release-instruction")).toBeInTheDocument();
  });

  it("invokes onSubmit with a PitchResult when the release meter is clicked", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PitcherArcade gameplay={makeGameplay()} onSubmit={onSubmit} />);

    await user.click(screen.getByTestId("zone-low-away"));
    await user.click(screen.getByTestId("release-meter"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const result = onSubmit.mock.calls[0][0];
    expect([
      "perfect_pitch",
      "good_pitch",
      "competitive_miss",
      "ball",
      "hanger",
    ]).toContain(result);
  });

  it("auto-submits a 'ball' result when the player never engages the release meter", async () => {
    vi.useFakeTimers();
    const onSubmit = vi.fn();
    try {
      render(
        <PitcherArcade
          gameplay={makeGameplay({ accuracyWindowMs: 100 })}
          onSubmit={onSubmit}
        />,
      );
      fireEvent.click(screen.getByTestId("zone-low-away"));
      vi.advanceTimersByTime(500);
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit.mock.calls[0][0]).toBe("ball");
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not double-submit if the meter is clicked twice", () => {
    const onSubmit = vi.fn();
    render(<PitcherArcade gameplay={makeGameplay()} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByTestId("zone-low-away"));
    fireEvent.click(screen.getByTestId("release-meter"));
    fireEvent.click(screen.getByTestId("release-meter"));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe("titleCasePitchType", () => {
  it("title-cases the canonical fixture values", () => {
    expect(titleCasePitchType("fastball")).toBe("Fastball");
    expect(titleCasePitchType("slider")).toBe("Slider");
  });

  it("returns an empty string for empty input", () => {
    expect(titleCasePitchType("")).toBe("");
  });

  it("lowercases unexpected casing before capitalizing", () => {
    expect(titleCasePitchType("SLIDER")).toBe("Slider");
  });
});
