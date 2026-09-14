import "server-only";
import { inCidr } from "./cidr";

export { inCidr };

/**
 * Commenting is limited to people on the block's network.
 *
 * A browser cannot read the wifi SSID, so "are you on the block wifi" is
 * answered by where the request comes from: that network leaves through its
 * own public addresses. Put those in COMMENT_IP_RANGES.
 *
 * Anyone may read the wall and post a confession. This gate covers replies
 * only, so the conversation under a confession stays with people who are
 * actually there.
 *
 * What it does and does not buy:
 *  - wifi passes, mobile data does NOT: that is the carrier's network;
 *  - a VPN off the network fails, and one back onto it passes;
 *  - if the block shares an egress with the rest of campus, this is campus-wide
 *    in practice, because that is all an address can prove.
 */

function ranges(): string[] {
  return (process.env.COMMENT_IP_RANGES ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
}

/** The gate only exists once ranges are configured. */
export function commentGateEnabled(): boolean {
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

/** Whether this address is allowed to reply to a confession. */
export function canComment(ip?: string): boolean {
  if (!commentGateEnabled()) return true;
  if (!ip) return false;

  // Local development is always let through; production never is.
  if (process.env.NODE_ENV !== "production" && isLoopbackOrPrivate(ip)) return true;

  return ranges().some((cidr) => inCidr(ip, cidr));
}
