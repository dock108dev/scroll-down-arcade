import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import fixtureRaw from "@/lib/fixtures/dailyPressurePack.sample.json";
import type { ArcadeDailyPressurePack } from "@/lib/api/types";

// Typed cast: TS widens JSON array string-literals to `string`, so a direct
// variable annotation can't accept the literal-union fields (momentType,
// pressureTier, half). The `as` here still validates structural shape —
// missing or type-mismatched fields fail tsc. Literal-union values are
// checked at runtime in the suites below.
const fixture = fixtureRaw as ArcadeDailyPressurePack;

describe("dailyPressurePack.sample.json", () => {
  it("parses as JSON", () => {
    const raw = readFileSync(
      join(__dirname, "../../src/lib/fixtures/dailyPressurePack.sample.json"),
      "utf8",
    );
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it("contains exactly 2 moments", () => {
    expect(fixture.moments).toHaveLength(2);
  });

  it("has a hitter moment at rank 1 (Aaron Judge vs Felix Bautista, NYY-BAL 2026-05-12)", () => {
    const m = fixture.moments.find((x) => x.rank === 1);
    expect(m).toBeDefined();
    expect(m?.momentType).toBe("hitter");
    expect(m?.gameId).toBe("nyy-bal-2026-05-12");
    expect(m?.situation.batter.name).toBe("Aaron Judge");
    expect(m?.situation.pitcher.name).toBe("Felix Bautista");
    expect(m?.gameplay.hitter).toBeDefined();
    expect(m?.gameplay.pitcher).toBeUndefined();
  });

  it("has a pitcher moment at rank 2 (Evan Phillips vs Manny Machado, LAD-SD 2026-05-12)", () => {
    const m = fixture.moments.find((x) => x.rank === 2);
    expect(m).toBeDefined();
    expect(m?.momentType).toBe("pitcher");
    expect(m?.gameId).toBe("lad-sd-2026-05-12");
    expect(m?.situation.batter.name).toBe("Manny Machado");
    expect(m?.situation.pitcher.name).toBe("Evan Phillips");
    expect(m?.gameplay.pitcher).toBeDefined();
    expect(m?.gameplay.hitter).toBeUndefined();
  });

  it("represents both hitter and pitcher gameplay subtypes across the pack", () => {
    const hasHitter = fixture.moments.some((m) => m.gameplay.hitter);
    const hasPitcher = fixture.moments.some((m) => m.gameplay.pitcher);
    expect(hasHitter).toBe(true);
    expect(hasPitcher).toBe(true);
  });

  it("uses pack-level metadata from BRAINDUMP", () => {
    expect(fixture.date).toBe("2026-05-13");
    expect(fixture.title).toBe("Daily MLB Pressure Run");
    expect(fixture.subtitle).toMatch(/yesterday/i);
  });

  it("keeps difficulty within 0–100 for every moment", () => {
    for (const m of fixture.moments) {
      expect(m.difficulty).toBeGreaterThanOrEqual(0);
      expect(m.difficulty).toBeLessThanOrEqual(100);
    }
  });
});
