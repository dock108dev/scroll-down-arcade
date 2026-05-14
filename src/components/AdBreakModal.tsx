"use client";

import { useEffect, useRef } from "react";

/**
 * Strikeout ad-break modal.
 *
 * MVP shows a placeholder card with a Continue button — no real ad SDK
 * integration. The modal is dismiss-only via the Continue control: there
 * is no close affordance, because cancelling out of the ad-break would
 * leave the state machine wedged in `ad_break` with zero strikes.
 *
 * The Continue button auto-focuses on mount so keyboard users can confirm
 * without tabbing through the heading. `aria-modal` and a backdrop click
 * are intentionally NOT wired to a dismiss handler — the only exit is
 * `onContinue`.
 */

interface AdBreakModalProps {
  onContinue: () => void;
}

export function AdBreakModal({ onContinue }: AdBreakModalProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ad-break-title"
      data-testid="ad-break-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.75)" }}
    >
      <div
        className="w-full max-w-md flex flex-col gap-4 rounded-lg p-6"
        style={{
          backgroundColor: "var(--arcade-surface)",
          border: "1px solid var(--arcade-border)",
        }}
      >
        <h2
          id="ad-break-title"
          className="text-lg font-bold uppercase tracking-widest"
          style={{ color: "var(--arcade-accent)" }}
        >
          Ad Break Placeholder
        </h2>
        <p
          className="text-sm"
          style={{ color: "var(--arcade-muted)" }}
        >
          You&rsquo;re out of strikes. Continue to keep your run going with
          three fresh strikes.
        </p>
        <button
          ref={buttonRef}
          type="button"
          data-testid="ad-continue"
          onClick={onContinue}
          className="w-full rounded-md py-3 font-bold text-black"
          style={{ backgroundColor: "var(--arcade-accent)" }}
        >
          Continue Run
        </button>
      </div>
    </div>
  );
}

export default AdBreakModal;
