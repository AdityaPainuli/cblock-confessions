import "server-only";
import { createHmac, timingSafeEqual, randomBytes } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "cbc_admin";
const TTL_MS = 1000 * 60 * 60 * 8;

function secret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("ADMIN_SESSION_SECRET must be set to at least 16 characters.");
  }
  return s;
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new Error("ADMIN_PASSWORD is not set.");
  // Hash both sides first so the comparison is constant length.
  const h = (v: string) => createHmac("sha256", secret()).update(v).digest("hex");
  return safeEqual(h(input), h(expected));
}

export async function startSession() {
  const expires = Date.now() + TTL_MS;
  const payload = `${expires}.${randomBytes(8).toString("hex")}`;
  const store = await cookies();
  store.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  const parts = raw.split(".");
  if (parts.length !== 3) return false;
  const [expires, nonce, mac] = parts;
  if (!safeEqual(sign(`${expires}.${nonce}`), mac)) return false;
  return Number(expires) > Date.now();
}
