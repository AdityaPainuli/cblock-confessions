import "server-only";

type Bucket = number[];

const hits = new Map<string, Bucket>();
let lastSweep = Date.now();

/** Drops buckets whose every hit has aged out, so the map cannot grow forever. */
function sweep(now: number, windowMs: number) {
  if (now - lastSweep < windowMs) return;
  lastSweep = now;
  for (const [key, times] of hits) {
    if (!times.some((t) => now - t < windowMs)) hits.delete(key);
  }
}

/**
 * Naive per-process limiter. Enough to stop one bored student spamming the
 * wall; swap for Upstash if this ever runs on more than one instance.
 */
export function allow(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  sweep(now, windowMs);

  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

/**
 * Requires every dimension to be under its limit.
 *
 * The client IP comes from X-Forwarded-For, which a caller can set freely
 * unless a proxy overwrites it (Vercel does). Pairing it with the device
 * fingerprint means spoofing the header alone no longer buys a fresh quota.
 */
export function allowAll(
  checks: { key: string; limit: number; windowMs: number }[],
): boolean {
  // Evaluate all of them so each dimension records the attempt.
  return checks.map((c) => allow(c.key, c.limit, c.windowMs)).every(Boolean);
}
