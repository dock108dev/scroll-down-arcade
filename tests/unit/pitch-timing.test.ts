import { describe, it, expect } from "vitest";

import { PITCH_PATH_DRIFT_PX, pitchDriftPx } from "@/lib/game/timing";

describe("PITCH_PATH_DRIFT_PX", () => {
  it("exports drift values for at least the seven documented pitch paths", () => {
    const required = [
      "middle-in",
      "middle-out",
      "middle",
      "up-in",
      "up-out",
      "low-in",
      "low-away",
    ];
    for (const key of required) {
      expect(PITCH_PATH_DRIFT_PX).toHaveProperty(key);
      expect(typeof PITCH_PATH_DRIFT_PX[key]).toBe("number");
    }
  });

  it("uses negative drift for inside paths and positive drift for outside paths", () => {
    expect(PITCH_PATH_DRIFT_PX["middle-in"]).toBeLessThan(0);
    expect(PITCH_PATH_DRIFT_PX["up-in"]).toBeLessThan(0);
    expect(PITCH_PATH_DRIFT_PX["low-in"]).toBeLessThan(0);
    expect(PITCH_PATH_DRIFT_PX["middle-out"]).toBeGreaterThan(0);
    expect(PITCH_PATH_DRIFT_PX["up-out"]).toBeGreaterThan(0);
    expect(PITCH_PATH_DRIFT_PX["low-away"]).toBeGreaterThan(0);
  });

  it("uses 0 drift for straight paths", () => {
    expect(PITCH_PATH_DRIFT_PX["middle"]).toBe(0);
  });

  it("keeps drift magnitudes within a 375px viewport (|drift| <= 40px)", () => {
    for (const px of Object.values(PITCH_PATH_DRIFT_PX)) {
      expect(Math.abs(px)).toBeLessThanOrEqual(40);
    }
  });
});

describe("pitchDriftPx", () => {
  it("returns a negative number for 'middle-in'", () => {
    expect(pitchDriftPx("middle-in")).toBeLessThan(0);
  });

  it("returns a positive number for 'middle-out'", () => {
    expect(pitchDriftPx("middle-out")).toBeGreaterThan(0);
  });

  it("returns 0 for 'middle'", () => {
    expect(pitchDriftPx("middle")).toBe(0);
  });

  it("returns 0 for unknown pitch path values", () => {
    expect(pitchDriftPx("nonsense")).toBe(0);
    expect(pitchDriftPx("")).toBe(0);
  });
});
