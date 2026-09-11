import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { checkPassword, startSession } from "@/lib/auth";
import { clientIp } from "@/lib/device";
import { allow } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = clientIp(await headers()) ?? "unknown";
  if (!allow(`login:${ip}`, 8, 15 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const { password } = await req.json().catch(() => ({ password: "" }));
  if (typeof password !== "string" || !checkPassword(password)) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  await startSession();
  return NextResponse.json({ ok: true });
}
