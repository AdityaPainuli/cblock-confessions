"use client";

import { useSyncExternalStore } from "react";

export type Tier = "high" | "low";

let cached: Tier | null = null;

function detect(): Tier {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "low";

  const nav = navigator as Navigator & { deviceMemory?: number };
  if ((nav.hardwareConcurrency ?? 4) <= 3 || (nav.deviceMemory ?? 4) <= 2) return "low";

  try {
    if (!document.createElement("canvas").getContext("webgl2")) return "low";
  } catch {
    return "low";
  }
  return "high";
}

const subscribe = () => () => {};
const getSnapshot = () => (cached ??= detect());
const getServerSnapshot = () => null;

/**
 * Cheap phones and reduced-motion visitors get the flat CSS campus instead of
 * WebGL. Measured once per page load, so the scene never swaps mid-session.
 * Null until the first client render, which is when the DOM APIs exist.
 */
export function useDeviceTier(): Tier | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
