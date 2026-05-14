import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { FieldState } from "@/components/FieldState";
import type { ArcadeRunners } from "@/lib/api/types";

function runners(overrides: Partial<ArcadeRunners> = {}): ArcadeRunners {
  return { first: false, second: false, third: false, ...overrides };
}

describe("FieldState", () => {
  it("renders an SVG with the spec'd viewBox and width", () => {
    render(<FieldState runners={runners()} />);
    const svg = screen.getByTestId("field-state");
    expect(svg.getAttribute("viewBox")).toBe("0 0 320 320");
    expect(svg.getAttribute("width")).toBe("100%");
    expect(svg.getAttribute("class") ?? "").toMatch(/max-w-\[280px\]/);
  });

  it("paints the SVG canvas on the dark arcade background token", () => {
    render(<FieldState runners={runners()} />);
    const svg = screen.getByTestId("field-state");
    expect(svg.getAttribute("style") ?? "").toContain(
      "background-color: var(--arcade-bg)",
    );
  });

  it("fills occupied bases with the amber accent token", () => {
    render(
      <FieldState
        runners={runners({ first: true, third: true })}
      />,
    );
    const first = screen.getByTestId("base-first");
    const second = screen.getByTestId("base-second");
    const third = screen.getByTestId("base-third");

    expect(first.getAttribute("fill")).toBe("var(--arcade-accent)");
    expect(third.getAttribute("fill")).toBe("var(--arcade-accent)");
    expect(second.getAttribute("fill")).toBe("var(--arcade-surface)");
    expect(second.getAttribute("stroke")).toBe("var(--arcade-border)");
  });

  it("draws home plate in the border (unlit) color regardless of runners", () => {
    render(
      <FieldState
        runners={runners({ first: true, second: true, third: true })}
      />,
    );
    const home = screen.getByTestId("base-home");
    expect(home.getAttribute("fill")).toBe("var(--arcade-surface)");
    expect(home.getAttribute("stroke")).toBe("var(--arcade-border)");
  });

  it("does not render any runner labels (situation display, not animation)", () => {
    const { container } = render(
      <FieldState runners={runners({ first: true })} />,
    );
    expect(container.querySelectorAll("text").length).toBe(0);
  });
});
