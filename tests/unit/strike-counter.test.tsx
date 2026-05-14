import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { StrikeCounter } from "@/components/StrikeCounter";

describe("StrikeCounter", () => {
  it("renders three slots by default with all filled at full strikes", () => {
    render(<StrikeCounter strikesRemaining={3} />);
    const slots = [0, 1, 2].map((i) => screen.getByTestId(`strike-slot-${i}`));
    for (const s of slots) {
      expect(s.getAttribute("data-filled")).toBe("true");
      expect(s.style.backgroundColor).toBe("var(--arcade-accent)");
    }
  });

  it("renders depleted slots hollow with the border token", () => {
    render(<StrikeCounter strikesRemaining={1} />);
    expect(
      screen.getByTestId("strike-slot-0").getAttribute("data-filled"),
    ).toBe("true");
    expect(
      screen.getByTestId("strike-slot-1").getAttribute("data-filled"),
    ).toBe("false");
    expect(
      screen.getByTestId("strike-slot-2").getAttribute("data-filled"),
    ).toBe("false");
    const empty = screen.getByTestId("strike-slot-2");
    expect(empty.style.backgroundColor).toBe("transparent");
  });

  it("clamps strikesRemaining below 0 to 0", () => {
    render(<StrikeCounter strikesRemaining={-1} />);
    for (const i of [0, 1, 2]) {
      expect(
        screen.getByTestId(`strike-slot-${i}`).getAttribute("data-filled"),
      ).toBe("false");
    }
  });

  it("clamps strikesRemaining above strikesTotal to strikesTotal", () => {
    render(<StrikeCounter strikesRemaining={99} strikesTotal={3} />);
    for (const i of [0, 1, 2]) {
      expect(
        screen.getByTestId(`strike-slot-${i}`).getAttribute("data-filled"),
      ).toBe("true");
    }
  });

  it("exposes an accessible label describing the remaining count", () => {
    render(<StrikeCounter strikesRemaining={2} />);
    const root = screen.getByTestId("strike-counter");
    expect(root.getAttribute("aria-label")).toBe(
      "2 of 3 strikes remaining",
    );
    expect(root.getAttribute("role")).toBe("status");
  });
});
