"use client";

import { useSyncExternalStore } from "react";

/**
 * How much scene we can afford to draw.
 *  - `high`   desktop GPU: shadows, full prop detail
 *  - `medium` most phones: WebGL, no shadows, instanced props, capped pixel ratio
 *  - `low`    weak devices and reduced-motion: no WebGL at all, SVG campus
 */
export type Tier = "high" | "medium" | "low";

export type Quality = {
  tier: Tier;
  shadows: boolean;
  dpr: [number, number];
  /** Prop density multiplier: palms, shrubs, pylons, fountains. */
  props: number;
  shadowMap: number;
  antialias: boolean;
};

export const QUALITY: Record<Tier, Quality> = {
  high: { tier: "high", shadows: true, dpr: [1, 1.75], props: 1, shadowMap: 2048, antialias: true },
  medium: { tier: "medium", shadows: false, dpr: [1, 1.3], props: 0.5, shadowMap: 0, antialias: false },
  low: { tier: "low", shadows: false, dpr: [1, 1], props: 0, shadowMap: 0, antialias: false },
};

let cached: Tier | null = null;

function detect(): Tier {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "low";

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean; effectiveType?: string };
  };

  // Data Saver and 2g/3g: never pull the WebGL bundle.
  const conn = nav.connection;
  if (conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? "")) return "low";

  const cores = nav.hardwareConcurrency ?? 4;
  const memory = nav.deviceMemory ?? 4;
  if (cores <= 3 || memory <= 2) return "low";

  try {
    if (!document.createElement("canvas").getContext("webgl2")) return "low";
  } catch {
    return "low";
  }

  // Coarse pointer plus a narrow screen means a phone: WebGL, but a light one.
  const phone =
    window.matchMedia("(pointer: coarse)").matches && Math.min(screen.width, screen.height) < 820;
  if (phone) return memory <= 4 || cores <= 5 ? "low" : "medium";

  return "high";
}

const subscribe = () => () => {};
const getSnapshot = () => (cached ??= detect());
const getServerSnapshot = () => null;

/** Null until the first client render, which is when the DOM APIs exist. */
export function useDeviceTier(): Tier | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
