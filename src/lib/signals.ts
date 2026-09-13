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
