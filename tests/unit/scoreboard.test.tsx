import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { Scoreboard } from "@/components/Scoreboard";
import type { ArcadeSituation } from "@/lib/api/types";

function makeSituation(overrides: Partial<ArcadeSituation> = {}): ArcadeSituation {
  return {
    inning: 9,
    half: "bottom",
    outs: 1,
    balls: 2,
    strikes: 1,
    awayTeam: "BAL",
    homeTeam: "NYY",
    awayScore: 4,
    homeScore: 4,
    runners: { first: false, second: true, third: false },
    batter: { id: "p1", name: "A", handedness: "R" },
    pitcher: { id: "p2", name: "B", handedness: "R" },
    ...overrides,
  };
}

function colorOf(el: HTMLElement) {
  return el.style.color;
}

describe("Scoreboard", () => {
  it("renders both team abbreviations and score digits", () => {
    render(<Scoreboard situation={makeSituation()} />);
    expect(screen.getByText("BAL")).toBeInTheDocument();
    expect(screen.getByText("NYY")).toBeInTheDocument();
    // Both score lines share the value 4.
    expect(screen.getAllByText("4")).toHaveLength(2);
  });

  it("renders score digits in the arcade accent color using a mono font", () => {
    render(<Scoreboard situation={makeSituation({ awayScore: 7, homeScore: 12 })} />);
    const away = screen.getByText("7");
    const home = screen.getByText("12");
    for (const el of [away, home]) {
      expect(colorOf(el)).toBe("var(--arcade-accent)");
      expect(el.className).toMatch(/font-mono/);
      expect(el.className).toMatch(/text-2xl/);
      expect(el.className).toMatch(/font-bold/);
    }
  });

  it("renders team abbreviations in fixed-width columns", () => {
    render(<Scoreboard situation={makeSituation()} />);
    // w-8 fixed-width prevents score-digit growth from shifting the row.
    expect(screen.getByText("BAL").className).toMatch(/w-8/);
    expect(screen.getByText("NYY").className).toMatch(/w-8/);
  });

  it("renders inning glyph ▲ for top-half innings and ▼ for bottom-half", () => {
    const { rerender } = render(
      <Scoreboard situation={makeSituation({ half: "top", inning: 3 })} />,
    );
    expect(screen.getByText("▲")).toBeInTheDocument();
    rerender(<Scoreboard situation={makeSituation({ half: "bottom", inning: 9 })} />);
    expect(screen.getByText("▼")).toBeInTheDocument();
  });

  it("renders outs as 3 dots — filled for actual outs, hollow for remaining", () => {
    render(<Scoreboard situation={makeSituation({ outs: 2 })} />);
    const region = screen.getByLabelText(/out/i);
    const dots = Array.from(region.querySelectorAll("span"));
    expect(dots).toHaveLength(3);
    expect(dots.filter((d) => d.textContent === "●")).toHaveLength(2);
    expect(dots.filter((d) => d.textContent === "○")).toHaveLength(1);
  });

  it("renders count as `B {balls} — S {strikes}` in muted color", () => {
    render(<Scoreboard situation={makeSituation({ balls: 3, strikes: 2 })} />);
    const count = screen.getByText("B 3 — S 2");
    expect(colorOf(count)).toBe("var(--arcade-muted)");
  });
});
