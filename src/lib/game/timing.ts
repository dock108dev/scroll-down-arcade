/**
 * Visual timing primitives shared by the hitter and pitcher arcade mechanics.
 *
 * `PITCH_PATH_DRIFT_PX` maps the wire `gameplay.hitter.pitchPath` string to a
 * horizontal drift value (in CSS pixels) that the pitch ball's approach
 * animation uses to translate alongside its vertical fall. Negative values
 * drift toward the batter's hands (left, for the default right-handed batter
 * view); positive values drift away. Magnitudes are calibrated for a 375px
 * mobile viewport so the motion reads as perceptible without overshooting
 * the strike-zone overlay.
 */

export const PITCH_PATH_DRIFT_PX: Record<string, number> = {
  "middle-in": -18,
  "middle-out": 18,
  middle: 0,
  "up-in": -12,
  "up-out": 12,
  "low-in": -14,
  "low-away": 20,
};

/** Drift in CSS pixels for a wire `pitchPath` value; unknown strings default to 0. */
export const pitchDriftPx = (pitchPath: string): number =>
  PITCH_PATH_DRIFT_PX[pitchPath] ?? 0;

/**
 * 3x3 strike-zone grid used by the pitcher targeting phase. Cells are laid
 * out row-major from top-left (`up-in` for a RHB view) to bottom-right
 * (`low-away`). The same string vocabulary doubles as the wire
 * `recommendedZone` and `pitchPath` value space, so the targeting grid
 * lines up 1:1 with the hitter's incoming pitch geometry.
 */
export const ZONE_QUADRANTS: readonly string[] = [
  "up-in",
  "up-middle",
  "up-out",
  "middle-in",
  "middle",
  "middle-out",
  "low-in",
  "low-middle",
  "low-away",
] as const;

/**
 * Title-case a visual pitch type string for display. Wire values arrive as
 * lowercase single-word strings (`"fastball"`, `"slider"`). Returns the
 * input unchanged when it is empty so the caller never has to special-case
 * missing data — an empty label simply renders as nothing.
 */
export function titleCasePitchType(pitchType: string): string {
  if (!pitchType) return "";
  return pitchType.charAt(0).toUpperCase() + pitchType.slice(1).toLowerCase();
}
