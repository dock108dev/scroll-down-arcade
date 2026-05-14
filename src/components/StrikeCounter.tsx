import { STARTING_STRIKES } from "@/lib/game/stateMachine";

/**
 * Compact strike indicator shown alongside gameplay states.
 *
 * Renders `strikesTotal` slots; the first `strikesRemaining` are filled
 * with the arcade accent (amber LED), the rest are hollow with a dim
 * border. A drained counter (0 remaining) is still mounted with all
 * slots hollow so the row height stays stable across transitions —
 * otherwise the ad-break modal would pop up against a layout that just
 * shrunk.
 */

interface StrikeCounterProps {
  strikesRemaining: number;
  strikesTotal?: number;
}

export function StrikeCounter({
  strikesRemaining,
  strikesTotal = STARTING_STRIKES,
}: StrikeCounterProps) {
  const safeTotal = Math.max(0, strikesTotal);
  const safeRemaining = Math.min(Math.max(0, strikesRemaining), safeTotal);
  const slots = Array.from({ length: safeTotal }, (_, i) => i < safeRemaining);

  return (
    <div
      data-testid="strike-counter"
      role="status"
      aria-label={`${safeRemaining} of ${safeTotal} strikes remaining`}
      className="inline-flex items-center gap-2"
    >
      <span
        className="font-mono text-xs uppercase tracking-widest"
        style={{ color: "var(--arcade-muted)" }}
      >
        Strikes
      </span>
      <div className="flex items-center gap-1">
        {slots.map((filled, i) => (
          <span
            key={i}
            aria-hidden="true"
            data-testid={`strike-slot-${i}`}
            data-filled={filled ? "true" : "false"}
            className="inline-block h-3 w-3 rounded-full"
            style={{
              backgroundColor: filled
                ? "var(--arcade-accent)"
                : "transparent",
              border: "1px solid var(--arcade-border)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default StrikeCounter;
