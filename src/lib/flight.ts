/**
 * Camera flight timings, shared between the 3D scene and the UI that waits for
 * it. Kept in its own module so importing the durations does not drag the
 * three.js chunk into a component that has no use for it.
 */
export const FLIGHT_MS: Record<"campus" | "blocks" | "wall", number> = {
  campus: 1300,
  blocks: 1200,
  // Longest, because this one is the payoff: the camera flies in to a building.
  wall: 1800,
};

/** Slow out of the old view, quick through the middle, settle into the new. */
export function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
