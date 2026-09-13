/**
 * Address matching for the campus network gate. Pure and dependency-free so it
 * can be exercised directly; the environment side lives in `campus.ts`.
 */

/** Expands an address to its raw bytes: 4 for IPv4, 16 for IPv6. */
function toBytes(ip: string): Uint8Array | null {
  const addr = ip.trim().replace(/^\[|\]$/g, "").split("%")[0];

  if (addr.includes(".") && !addr.includes(":")) {
    const parts = addr.split(".");
    if (parts.length !== 4) return null;
    const out = new Uint8Array(4);
    for (let i = 0; i < 4; i++) {
      if (!/^\d{1,3}$/.test(parts[i])) return null;
      const n = Number(parts[i]);
      if (n > 255) return null;
      out[i] = n;
    }
    return out;
  }

  if (!addr.includes(":")) return null;

  // ::ffff:1.2.3.4 and friends: keep the IPv4 tail as its own four bytes.
  let tail: Uint8Array | null = null;
  let head = addr;
  const lastColon = addr.lastIndexOf(":");
  const maybeV4 = addr.slice(lastColon + 1);
  if (maybeV4.includes(".")) {
    tail = toBytes(maybeV4);
    if (!tail) return null;
    head = addr.slice(0, lastColon + 1);
  }

  const halves = head.split("::");
  if (halves.length > 2) return null;

  const parseGroups = (s: string) =>
    s
      .split(":")
      .filter(Boolean)
      .map((g) => (/^[0-9a-fA-F]{1,4}$/.test(g) ? parseInt(g, 16) : NaN));

  const left = parseGroups(halves[0] ?? "");
  const right = halves.length === 2 ? parseGroups(halves[1] ?? "") : [];
  if ([...left, ...right].some(Number.isNaN)) return null;

  const tailGroups = tail ? 2 : 0;
  const total = left.length + right.length + tailGroups;
  if (total > 8) return null;
  if (halves.length === 1 && total !== 8) return null;

  const groups = [
    ...left,
    ...new Array(8 - total).fill(0),
    ...right,
  ];

  const out = new Uint8Array(16);
  groups.forEach((g, i) => {
    out[i * 2] = (g >> 8) & 0xff;
    out[i * 2 + 1] = g & 0xff;
  });
  if (tail) out.set(tail, 12);
  return out;
}

/** Unwraps ::ffff:a.b.c.d so a v4 range still matches a v4-mapped address. */
function normalise(bytes: Uint8Array): Uint8Array {
  if (bytes.length === 16) {
    const mapped =
      bytes.slice(0, 10).every((b) => b === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
    if (mapped) return bytes.slice(12);
  }
  return bytes;
}

/** True when `ip` falls inside `cidr`. A bare address means /32 or /128. */
export function inCidr(ip: string, cidr: string): boolean {
  const [net, bitsRaw] = cidr.trim().split("/");
  const netBytes = toBytes(net);
  const ipBytes = toBytes(ip);
  if (!netBytes || !ipBytes) return false;

  const a = normalise(netBytes);
  const b = normalise(ipBytes);
  if (a.length !== b.length) return false;

  const bits = bitsRaw === undefined ? a.length * 8 : Number(bitsRaw);
  if (!Number.isInteger(bits) || bits < 0 || bits > a.length * 8) return false;

  const whole = bits >> 3;
  for (let i = 0; i < whole; i++) if (a[i] !== b[i]) return false;

  const rest = bits & 7;
  if (rest === 0) return true;

  const mask = (0xff << (8 - rest)) & 0xff;
  return (a[whole] & mask) === (b[whole] & mask);
}
