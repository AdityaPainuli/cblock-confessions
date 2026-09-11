import "server-only";
import { UAParser } from "ua-parser-js";
import type { ClientSignals } from "./types";

type Headers_ = Awaited<ReturnType<typeof import("next/headers").headers>>;

export type GeoLookup = {
  geo_city?: string;
  geo_region?: string;
  geo_country?: string;
  geo_postal?: string;
  geo_lat?: number;
  geo_lon?: number;
  geo_isp?: string;
  geo_source?: string;
};

/**
 * Best-effort client IP. Vercel and most proxies put the real address first in
 * x-forwarded-for; everything after it is the proxy chain.
 */
export function clientIp(h: Headers_): string | undefined {
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip") ?? h.get("cf-connecting-ip") ?? undefined;
}

function isPrivate(ip: string) {
  return (
    ip === "::1" ||
    ip === "127.0.0.1" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("fc") ||
    ip.startsWith("fd")
  );
}

/**
 * Location for an IP. Vercel injects geo headers on its edge for free, so we
 * use those when deployed and fall back to a public lookup service locally.
 */
export async function geoLookup(h: Headers_, ip?: string): Promise<GeoLookup> {
  const city = h.get("x-vercel-ip-city");
  if (city) {
    const lat = h.get("x-vercel-ip-latitude");
    const lon = h.get("x-vercel-ip-longitude");
    return {
      geo_city: decodeURIComponent(city),
      geo_region: h.get("x-vercel-ip-country-region") ?? undefined,
      geo_country: h.get("x-vercel-ip-country") ?? undefined,
      geo_postal: h.get("x-vercel-ip-postal-code") ?? undefined,
      geo_lat: lat ? Number(lat) : undefined,
      geo_lon: lon ? Number(lon) : undefined,
      geo_source: "vercel-edge",
    };
  }

  if (!ip || isPrivate(ip)) return { geo_source: "local" };

  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city,zip,lat,lon,isp`,
      { signal: AbortSignal.timeout(2500), cache: "no-store" },
    );
    if (!res.ok) return { geo_source: "lookup-failed" };
    const d = await res.json();
    if (d.status !== "success") return { geo_source: "lookup-failed" };
    return {
      geo_city: d.city,
      geo_region: d.regionName,
      geo_country: d.country,
      geo_postal: d.zip,
      geo_lat: d.lat,
      geo_lon: d.lon,
      geo_isp: d.isp,
      geo_source: "ip-api",
    };
  } catch {
    return { geo_source: "lookup-failed" };
  }
}

/** Flattens the UA string plus the browser-reported signals into one meta row. */
export function buildMeta(
  h: Headers_,
  signals: ClientSignals,
  geo: GeoLookup,
  ip?: string,
) {
  const ua = h.get("user-agent") ?? "";
  const parsed = UAParser(ua);

  return {
    ip,
    user_agent: ua,
    browser: parsed.browser.name,
    browser_version: parsed.browser.version,
    engine: parsed.engine.name,
    os: parsed.os.name,
    os_version: parsed.os.version,
    device_type: parsed.device.type ?? "desktop",
    device_vendor: parsed.device.vendor,
    device_model: parsed.device.model,
    screen: signals.screen,
    viewport: signals.viewport,
    pixel_ratio: signals.pixelRatio,
    timezone: signals.timezone,
    languages: signals.languages,
    platform: signals.platform,
    device_memory: signals.deviceMemory,
    cpu_cores: signals.cpuCores,
    touch_points: signals.touchPoints,
    gpu: signals.gpu,
    fingerprint: signals.fingerprint,
    referrer: h.get("referer") ?? undefined,
    ...geo,
  };
}
