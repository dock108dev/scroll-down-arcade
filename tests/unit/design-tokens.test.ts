import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const css = readFileSync(
  join(__dirname, "../../src/styles/globals.css"),
  "utf8",
);

// These tokens are the public contract every arcade component reads from.
// Renaming or removing one will silently desaturate components that fall
// back to UA defaults, so guard the names here.
const REQUIRED_TOKENS = [
  "--arcade-bg",
  "--arcade-surface",
  "--arcade-border",
  "--arcade-text",
  "--arcade-muted",
  "--arcade-accent",
  "--tier-extreme",
  "--tier-high",
  "--tier-medium",
  "--tier-low",
  "--result-perfect",
  "--result-good",
  "--result-okay",
  "--result-early",
  "--result-late",
  "--result-miss",
  "--result-ball",
  "--result-hanger",
  "--result-competitive-miss",
  "--safe-top",
  "--safe-bottom",
];

describe("globals.css design tokens", () => {
  it.each(REQUIRED_TOKENS)("declares %s", (token) => {
    expect(css).toContain(`${token}:`);
  });

  it("uses var(--arcade-bg) for the body background", () => {
    expect(css).toMatch(/body\s*{[^}]*background-color:\s*var\(--arcade-bg\)/s);
  });

  it("applies safe-area insets at the body level", () => {
    expect(css).toMatch(/padding-top:\s*var\(--safe-top\)/);
    expect(css).toMatch(/padding-bottom:\s*var\(--safe-bottom\)/);
  });
});
