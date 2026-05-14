import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MomentSetup } from "@/components/MomentSetup";
import type {
  ArcadeMomentSetup,
  MomentType,
  PressureTier,
} from "@/lib/api/types";

const SETUP: ArcadeMomentSetup = {
  headline: "Judge steps in with the game on the line",
  summary: "Tying run on second, one out, full count.",
  whyThisMoment: "Highest leverage PA of the night.",
};

function renderSetup(
  momentType: MomentType,
  pressureTier: PressureTier = "high",
  onStart: () => void = () => {},
) {
  return render(
    <MomentSetup
      setup={SETUP}
      momentType={momentType}
      pressureTier={pressureTier}
      onStart={onStart}
    />,
  );
}

describe("MomentSetup — role badge", () => {
  it("renders the hitter badge with blue-toned classes", () => {
    renderSetup("hitter");
    const badge = screen.getByTestId("role-badge");
    expect(badge.textContent).toContain("YOU ARE THE HITTER");
    expect(badge.className).toMatch(/bg-blue-950/);
    expect(badge.className).toMatch(/text-blue-300/);
    expect(badge.className).toMatch(/border-blue-700/);
  });

  it("renders the pitcher badge with orange-toned classes", () => {
    renderSetup("pitcher");
    const badge = screen.getByTestId("role-badge");
    expect(badge.textContent).toContain("YOU ARE THE PITCHER");
    expect(badge.className).toMatch(/bg-orange-950/);
    expect(badge.className).toMatch(/text-orange-300/);
    expect(badge.className).toMatch(/border-orange-700/);
  });
});

describe("MomentSetup — pressure tier accent", () => {
  it.each<PressureTier>(["extreme", "high", "medium", "low"])(
    "applies a 4px left border in the %s tier color",
    (tier) => {
      renderSetup("hitter", tier);
      const card = screen.getByTestId("moment-setup");
      expect(card.className).toMatch(/border-l-4/);
      expect(card.style.borderLeftColor).toBe(`var(--tier-${tier})`);
      expect(card.getAttribute("data-pressure-tier")).toBe(tier);
    },
  );
});

describe("MomentSetup — CTA color per role", () => {
  it("paints the hitter CTA with the arcade accent (amber)", () => {
    renderSetup("hitter");
    const cta = screen.getByTestId("moment-setup-cta");
    expect(cta.style.backgroundColor).toBe("var(--arcade-accent)");
    expect(cta.className).toMatch(/font-bold/);
    expect(cta.className).toMatch(/text-black/);
    expect(cta.className).toMatch(/w-full/);
  });

  it("paints the pitcher CTA with the tier-high orange token", () => {
    renderSetup("pitcher");
    const cta = screen.getByTestId("moment-setup-cta");
    expect(cta.style.backgroundColor).toBe("var(--tier-high)");
    expect(cta.style.backgroundColor).not.toBe(
      screen.getByTestId("moment-setup").style.backgroundColor,
    );
  });

  it("differs between hitter and pitcher renders", () => {
    const { rerender } = renderSetup("hitter");
    const hitterBg = (screen.getByTestId("moment-setup-cta") as HTMLElement).style
      .backgroundColor;
    rerender(
      <MomentSetup
        setup={SETUP}
        momentType="pitcher"
        pressureTier="high"
        onStart={() => {}}
      />,
    );
    const pitcherBg = (screen.getByTestId("moment-setup-cta") as HTMLElement).style
      .backgroundColor;
    expect(hitterBg).not.toBe(pitcherBg);
  });

  it("invokes onStart when the CTA is clicked", async () => {
    const onStart = vi.fn();
    renderSetup("hitter", "high", onStart);
    await userEvent.click(screen.getByTestId("moment-setup-cta"));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});

describe("MomentSetup — body copy tokens", () => {
  it("renders headline in arcade-text and summary in arcade-muted", () => {
    renderSetup("hitter");
    const headline = screen.getByText(SETUP.headline);
    const summary = screen.getByText(SETUP.summary);
    expect(headline.style.color).toBe("var(--arcade-text)");
    expect(headline.className).toMatch(/text-2xl/);
    expect(headline.className).toMatch(/font-bold/);
    expect(summary.style.color).toBe("var(--arcade-muted)");
    expect(summary.className).toMatch(/text-sm/);
  });

  it("renders whyThisMoment as italic arcade-accent xs text with a leading quote glyph", () => {
    renderSetup("hitter");
    const why = screen.getByText(SETUP.whyThisMoment, { exact: false, selector: "p" });
    expect(why.style.color).toBe("var(--arcade-accent)");
    expect(why.className).toMatch(/italic/);
    expect(why.className).toMatch(/text-xs/);
    expect(why.textContent).toContain("“");
  });
});
