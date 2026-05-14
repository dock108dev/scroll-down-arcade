import type { ArcadeRunners } from "@/lib/api/types";

interface FieldStateProps {
  runners: ArcadeRunners;
}

const BASE_CENTERS = {
  home: { x: 160, y: 270 },
  first: { x: 260, y: 170 },
  second: { x: 160, y: 70 },
  third: { x: 60, y: 170 },
} as const;

const BASE_RADIUS = 16;

function diamondPoints(cx: number, cy: number, r: number): string {
  return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
}

interface BaseProps {
  center: { x: number; y: number };
  occupied: boolean;
  testId: string;
}

function Base({ center, occupied, testId }: BaseProps) {
  return (
    <polygon
      data-testid={testId}
      data-occupied={occupied ? "true" : "false"}
      points={diamondPoints(center.x, center.y, BASE_RADIUS)}
      fill={
        occupied ? "var(--arcade-accent)" : "var(--arcade-surface)"
      }
      stroke="var(--arcade-border)"
      strokeWidth={1}
    />
  );
}

export function FieldState({ runners }: FieldStateProps) {
  const { home, first, second, third } = BASE_CENTERS;

  return (
    <svg
      data-testid="field-state"
      viewBox="0 0 320 320"
      width="100%"
      className="max-w-[280px]"
      role="img"
      aria-label="Base runner situation"
      style={{ backgroundColor: "var(--arcade-bg)" }}
    >
      <polyline
        points={`${home.x},${home.y} ${first.x},${first.y} ${second.x},${second.y} ${third.x},${third.y} ${home.x},${home.y}`}
        fill="none"
        stroke="var(--arcade-border)"
        strokeWidth={1}
      />

      <Base center={first} occupied={runners.first} testId="base-first" />
      <Base center={second} occupied={runners.second} testId="base-second" />
      <Base center={third} occupied={runners.third} testId="base-third" />

      <polygon
        data-testid="base-home"
        points={diamondPoints(home.x, home.y, BASE_RADIUS)}
        fill="var(--arcade-surface)"
        stroke="var(--arcade-border)"
        strokeWidth={1}
      />
    </svg>
  );
}

export default FieldState;
