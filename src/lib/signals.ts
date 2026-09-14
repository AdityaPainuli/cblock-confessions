"use client";

import type { ClientSignals } from "./types";

function gpuRenderer(): string | undefined {
  try {
    const c = document.createElement("canvas");
    const gl = (c.getContext("webgl") ??
      c.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) return undefined;
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = ext
      ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    return typeof renderer === "string" ? renderer : undefined;
  } catch {
    return undefined;
  }
}

function hash(input: string): string {
  // FNV-1a, 32 bit. Stable across sessions for the same device profile.
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

let cached: ClientSignals | null = null;

/**
 * Asks the device for its GPS position.
 *
 * The browser always shows its own permission prompt for this and the person
 * can refuse, so this resolves to null far more often than not. Never blocks
 * for long: a confession should not wait on a location fix.
 */
export function requestPreciseLocation(
  timeoutMs = 8000,
): Promise<{ lat: number; lon: number; accuracy: number } | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    let settled = false;
    const done = (v: { lat: number; lon: number; accuracy: number } | null) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };

    // Belt and braces: some browsers never call either callback if the prompt
    // is dismissed rather than answered.
    const timer = setTimeout(() => done(null), timeoutMs);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        done({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      () => {
        clearTimeout(timer);
        done(null);
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}

export function collectSignals(): ClientSignals {
  if (typeof window === "undefined") return {};
  if (cached) return cached;

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    languages?: readonly string[];
  };

  const s: ClientSignals = {
    screen: `${screen.width}x${screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    pixelRatio: window.devicePixelRatio,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    languages: (nav.languages ?? [nav.language]).join(","),
    platform: nav.platform,
    deviceMemory: nav.deviceMemory,
    cpuCores: nav.hardwareConcurrency,
    touchPoints: nav.maxTouchPoints,
    gpu: gpuRenderer(),
  };

  s.fingerprint = hash(
    [s.screen, s.timezone, s.languages, s.platform, s.cpuCores, s.gpu].join("|"),
  );
  cached = s;
  return s;
}
