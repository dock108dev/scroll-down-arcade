import type { CSSProperties } from "react";

import type {
  ArcadeMomentSetup,
  MomentType,
  PressureTier,
} from "@/lib/api/types";

interface MomentSetupProps {
  setup: ArcadeMomentSetup;
  momentType: MomentType;
  pressureTier: PressureTier;
  onStart: () => void;
}

const ROLE_BADGE: Record<
  MomentType,
  { label: string; className: string }
> = {
  hitter: {
    label: "🏏 YOU ARE THE HITTER",
    className: "bg-blue-950 text-blue-300 border border-blue-700",
  },
  pitcher: {
    label: "⚾ YOU ARE THE PITCHER",
    className: "bg-orange-950 text-orange-300 border border-orange-700",
  },
};

const CTA_LABEL: Record<MomentType, string> = {
  hitter: "Step in to hit",
  pitcher: "Take the mound",
};

function ctaStyle(momentType: MomentType): CSSProperties {
  // Hitter CTA uses the arcade amber accent; pitcher CTA uses the
  // tier-high orange so the two roles read as visually distinct without
  // introducing a hardcoded hex.
  return {
    backgroundColor:
      momentType === "hitter"
        ? "var(--arcade-accent)"
        : "var(--tier-high)",
  };
}

export function MomentSetup({
  setup,
  momentType,
  pressureTier,
  onStart,
}: MomentSetupProps) {
  const badge = ROLE_BADGE[momentType];

  return (
    <section
      data-testid="moment-setup"
      data-pressure-tier={pressureTier}
      data-moment-type={momentType}
      className="rounded-lg border-l-4 p-4 flex flex-col gap-3"
      style={{
        backgroundColor: "var(--arcade-surface)",
        borderLeftColor: `var(--tier-${pressureTier})`,
      }}
    >
      <span
        data-testid="role-badge"
        className={`self-start rounded-full px-3 py-1 text-xs font-mono uppercase tracking-wide ${badge.className}`}
      >
        {badge.label}
      </span>

      <h2
        className="text-2xl font-bold"
        style={{ color: "var(--arcade-text)" }}
      >
        {setup.headline}
      </h2>

      <p className="text-sm" style={{ color: "var(--arcade-muted)" }}>
        {setup.summary}
      </p>

      <p
        className="text-xs italic"
        style={{ color: "var(--arcade-accent)" }}
      >
        <span aria-hidden="true">“</span>
        {setup.whyThisMoment}
      </p>

      <button
        type="button"
        data-testid="moment-setup-cta"
        onClick={onStart}
        className="w-full rounded-md py-3 font-bold text-black"
        style={ctaStyle(momentType)}
      >
        {CTA_LABEL[momentType]}
      </button>
    </section>
  );
}

export default MomentSetup;
