import "server-only";

const hits = new Map<string, number[]>();

/**
 * Naive per-process limiter. Enough to stop one bored student spamming the
 * wall; swap for Upstash if this ever runs on more than one instance.
 */
export function allow(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}
