import "server-only";
import { inCidr } from "./cidr";

export { inCidr };

/**
 * Campus network gate.
 *
 * A browser cannot read the wifi SSID, so "are you on campus wifi" is answered
 * by where the request comes from: everything on the university network leaves
 * through the university's own public addresses. Put those ranges in
 * CAMPUS_IP_RANGES and only they get in.
 *
 * What this does and does not buy:
 *  - it keeps the wall off the open internet, which is the point;
 *  - campus wifi passes, campus mobile data does NOT (that is the carrier's
 *    network, not the university's);
 *  - a VPN back onto the campus network passes, and a VPN off it fails;
 *  - anyone who can reach the university network can reach the wall, so this
 *    is a fence, not an identity check.
 */

function ranges(): string[] {
  return (process.env.CAMPUS_IP_RANGES ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
}

/** The gate only exists once ranges are configured. */
export function campusGateEnabled(): boolean {
  return ranges().length > 0;
}

function isLoopbackOrPrivate(ip: string): boolean {
  return [
    "127.0.0.0/8",
    "10.0.0.0/8",
    "172.16.0.0/12",
    "192.168.0.0/16",
    "169.254.0.0/16",
    "::1/128",
    "fc00::/7",
    "fe80::/10",
  ].some((cidr) => inCidr(ip, cidr));
}

export function isOnCampus(ip?: string): boolean {
  if (!campusGateEnabled()) return true;
  if (!ip) return false;

  // Local development is always let through; production never is.
  if (process.env.NODE_ENV !== "production" && isLoopbackOrPrivate(ip)) return true;

  return ranges().some((cidr) => inCidr(ip, cidr));
}

/** Everything an API route or page needs to decide whether to let someone in. */
export type CampusCheck = { allowed: boolean; gated: boolean; ip?: string };

export function checkCampus(ip?: string): CampusCheck {
  return { allowed: isOnCampus(ip), gated: campusGateEnabled(), ip };
}
