import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RevealCard } from "@/components/RevealCard";
import fixtureRaw from "@/lib/fixtures/dailyPressurePack.sample.json";
import type {
  ArcadeDailyPressurePack,
  ArcadeMoment,
  PressureTier,
} from "@/lib/api/types";
import type { MomentResult } from "@/lib/game/scoring";
import type { RevealOutcome } from "@/lib/game/stateMachine";

const samplePack = fixtureRaw as ArcadeDailyPressurePack;
const HITTER_MOMENT = samplePack.moments.find((m) => m.momentType === "hitter")!;
const PITCHER_MOMENT = samplePack.moments.find(
  (m) => m.momentType === "pitcher",
)!;

function makeOutcome(
  result: MomentResult,
  scoreEarned: number,
  role: "hitter" | "pitcher" = "hitter",
): RevealOutcome {
  return {
    result,
    scoreEarned,
    lostStrike: result === "miss" || result === "hanger",
    cleared: !(result === "miss" || result === "hanger"),
    role,
  };
}

function withTier(moment: ArcadeMoment, tier: PressureTier): ArcadeMoment {
  return { ...moment, pressureTier: tier };
}

describe("RevealCard — user result label", () => {
  it("renders the hitter perfect label in text-4xl with the perfect token color", () => {
    render(
      <RevealCard
        moment={HITTER_MOMENT}
        lastOutcome={makeOutcome("perfect", 200)}
        onAdvance={() => {}}
        isFinalMoment={false}
      />,
    );
    const label = screen.getByTestId("reveal-result-label");
    expect(label.textContent).toBe("PERFECT HIT");
    expect(label.className).toMatch(/text-4xl/);
    expect(label.className).toMatch(/font-bold/);
    expect(label.className).toMatch(/font-mono/);
    expect(label.style.color).toBe("var(--result-perfect)");
  });

  it("maps a hitter miss onto the miss result token (red)", () => {
    render(
      <RevealCard
        moment={HITTER_MOMENT}
        lastOutcome={makeOutcome("miss", 0)}
        onAdvance={() => {}}
        isFinalMoment={false}
      />,
    );
    const label = screen.getByTestId("reveal-result-label");
    expect(label.textContent).toBe("MISS");
    expect(label.style.color).toBe("var(--result-miss)");
  });

  it.each<[MomentResult, string, string]>([
    ["good", "GOOD HIT", "var(--result-good)"],
    ["okay", "OKAY", "var(--result-okay)"],
    ["early", "EARLY", "var(--result-early)"],
    ["late", "LATE", "var(--result-late)"],
    ["perfect_pitch", "PERFECT PITCH", "var(--result-perfect)"],
    ["good_pitch", "GOOD PITCH", "var(--result-good)"],
    ["competitive_miss", "COMPETITIVE MISS", "var(--result-competitive-miss)"],
    ["ball", "BALL", "var(--result-ball)"],
    ["hanger", "HANGER", "var(--result-hanger)"],
  ])("%s renders as %s in %s", (result, label, color) => {
    render(
      <RevealCard
        moment={result === "perfect_pitch" || result === "good_pitch" || result === "ball" || result === "hanger" || result === "competitive_miss" ? PITCHER_MOMENT : HITTER_MOMENT}
        lastOutcome={makeOutcome(
          result,
          50,
          result === "perfect_pitch" || result === "good_pitch" || result === "ball" || result === "hanger" || result === "competitive_miss" ? "pitcher" : "hitter",
        )}
        onAdvance={() => {}}
        isFinalMoment={false}
      />,
    );
    const el = screen.getByTestId("reveal-result-label");
    expect(el.textContent).toBe(label);
    expect(el.style.color).toBe(color);
  });
});

describe("RevealCard — points badge", () => {
  it("renders the points earned with a + prefix in arcade-accent", () => {
    render(
      <RevealCard
        moment={HITTER_MOMENT}
        lastOutcome={makeOutcome("good", 1234)}
        onAdvance={() => {}}
        isFinalMoment={false}
      />,
    );
    const badge = screen.getByTestId("reveal-points-badge");
    expect(badge.textContent).toContain("+1,234 pts");
    expect(badge.className).toMatch(/text-xl/);
    expect(badge.className).toMatch(/font-mono/);
    expect(badge.style.color).toBe("var(--arcade-accent)");
  });
});

describe("RevealCard — MLB outcome divider + real outcome", () => {
  it("renders the divider label and the realOutcome.label as the reveal hero", () => {
    render(
      <RevealCard
        moment={HITTER_MOMENT}
        lastOutcome={makeOutcome("good", 70)}
        onAdvance={() => {}}
        isFinalMoment={false}
      />,
    );
    expect(screen.getByText(/Real MLB Result/i)).toBeTruthy();
    const hero = screen.getByTestId("reveal-real-outcome");
    expect(hero.textContent).toBe(HITTER_MOMENT.realOutcome.label);
    expect(hero.className).toMatch(/text-2xl/);
    expect(hero.className).toMatch(/font-bold/);
    expect(hero.style.color).toBe("var(--arcade-text)");
  });
});

describe("RevealCard — WPA pill colour matches pressure tier", () => {
  it.each<PressureTier>(["extreme", "high", "medium", "low"])(
    "fills the pill with var(--tier-%s) and white text",
    (tier) => {
      render(
        <RevealCard
          moment={withTier(HITTER_MOMENT, tier)}
          lastOutcome={makeOutcome("good", 70)}
          onAdvance={() => {}}
          isFinalMoment={false}
        />,
      );
      const pill = screen.getByTestId("reveal-wpa-badge");
      expect(pill.style.backgroundColor).toBe(`var(--tier-${tier})`);
      expect(pill.className).toMatch(/text-white/);
      expect(pill.className).toMatch(/rounded-full/);
      expect(pill.className).toMatch(/text-xs/);
      expect(pill.className).toMatch(/font-mono/);
      expect(pill.className).toMatch(/px-2/);
      expect(pill.className).toMatch(/py-0\.5/);
    },
  );

  it("formats wpaDelta as a 2-decimal value with a leading + when positive", () => {
    render(
      <RevealCard
        moment={HITTER_MOMENT}
        lastOutcome={makeOutcome("good", 70)}
        onAdvance={() => {}}
        isFinalMoment={false}
      />,
    );
    // fixture's hitter moment has wpaDelta = 0.42
    expect(screen.getByTestId("reveal-wpa-badge").textContent).toContain(
      "+0.42",
    );
  });
});

describe("RevealCard — recap copy", () => {
  it("renders the recap.afterReveal as italic muted text", () => {
    render(
      <RevealCard
        moment={HITTER_MOMENT}
        lastOutcome={makeOutcome("good", 70)}
        onAdvance={() => {}}
        isFinalMoment={false}
      />,
    );
    const recap = screen.getByTestId("reveal-recap");
    expect(recap.textContent).toBe(HITTER_MOMENT.recap.afterReveal);
    expect(recap.className).toMatch(/italic/);
    expect(recap.className).toMatch(/text-sm/);
    expect(recap.style.color).toBe("var(--arcade-muted)");
  });
});

describe("RevealCard — CTA wiring + copy", () => {
  it("invokes onAdvance when the CTA is clicked", async () => {
    const onAdvance = vi.fn();
    render(
      <RevealCard
        moment={HITTER_MOMENT}
        lastOutcome={makeOutcome("good", 70)}
        onAdvance={onAdvance}
        isFinalMoment={false}
      />,
    );
    await userEvent.click(screen.getByTestId("reveal-cta"));
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });

  it("CTA copy reads 'Next moment' mid-pack and 'See results' on the final moment", () => {
    const { rerender } = render(
      <RevealCard
        moment={HITTER_MOMENT}
        lastOutcome={makeOutcome("good", 70)}
        onAdvance={() => {}}
        isFinalMoment={false}
      />,
    );
    expect(screen.getByTestId("reveal-cta").textContent).toBe("Next moment");
    rerender(
      <RevealCard
        moment={HITTER_MOMENT}
        lastOutcome={makeOutcome("good", 70)}
        onAdvance={() => {}}
        isFinalMoment
      />,
    );
    expect(screen.getByTestId("reveal-cta").textContent).toBe("See results");
  });
});

describe("RevealCard — card chrome uses CSS variable tokens", () => {
  it("uses arcade-surface bg and arcade-border outline", () => {
    render(
      <RevealCard
        moment={HITTER_MOMENT}
        lastOutcome={makeOutcome("good", 70)}
        onAdvance={() => {}}
        isFinalMoment={false}
      />,
    );
    const card = screen.getByTestId("reveal-card");
    expect(card.style.backgroundColor).toBe("var(--arcade-surface)");
    expect(card.style.border).toContain("var(--arcade-border)");
    expect(card.className).toMatch(/rounded-xl/);
  });
});
