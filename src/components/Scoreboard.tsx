import type { ArcadeSituation } from "@/lib/api/types";

interface ScoreboardProps {
  situation: ArcadeSituation;
}

const OUTS_TOTAL = 3;

export function Scoreboard({ situation }: ScoreboardProps) {
  const {
    inning,
    half,
    outs,
    balls,
    strikes,
    awayTeam,
    homeTeam,
    awayScore,
    homeScore,
  } = situation;

  const inningGlyph = half === "top" ? "▲" : "▼";
  const outsDots = Array.from({ length: OUTS_TOTAL }, (_, i) => i < outs);

  return (
    <div
      data-testid="scoreboard"
      className="grid grid-cols-[1fr_auto] gap-4 rounded-lg border p-3"
      style={{
        backgroundColor: "var(--arcade-surface)",
        borderColor: "var(--arcade-border)",
      }}
    >
      <div className="grid grid-rows-2 gap-1">
        <div className="flex items-center gap-3">
          <span
            className="font-mono text-sm w-8 uppercase"
            style={{ color: "var(--arcade-text)" }}
          >
            {awayTeam}
          </span>
          <span
            className="font-mono text-2xl font-bold tabular-nums"
            style={{ color: "var(--arcade-accent)" }}
          >
            {awayScore}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span
            className="font-mono text-sm w-8 uppercase"
            style={{ color: "var(--arcade-text)" }}
          >
            {homeTeam}
          </span>
          <span
            className="font-mono text-2xl font-bold tabular-nums"
            style={{ color: "var(--arcade-accent)" }}
          >
            {homeScore}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end justify-between gap-1">
        <div
          className="font-mono text-sm flex items-center gap-1"
          style={{ color: "var(--arcade-accent)" }}
          aria-label={`${half === "top" ? "Top" : "Bottom"} of inning ${inning}`}
        >
          <span aria-hidden="true">{inningGlyph}</span>
          <span>{inning}</span>
        </div>
        <div
          className="flex items-center gap-1"
          aria-label={`${outs} out${outs === 1 ? "" : "s"}`}
        >
          {outsDots.map((filled, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="font-mono text-sm"
              style={{
                color: filled
                  ? "var(--arcade-text)"
                  : "var(--arcade-muted)",
              }}
            >
              {filled ? "●" : "○"}
            </span>
          ))}
        </div>
        <div
          className="font-mono text-sm"
          style={{ color: "var(--arcade-muted)" }}
        >
          B {balls} — S {strikes}
        </div>
      </div>
    </div>
  );
}

export default Scoreboard;
