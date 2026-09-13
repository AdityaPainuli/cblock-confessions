import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { clientIp } from "@/lib/device";
import { castVote } from "@/lib/data";
import { allowAll } from "@/lib/ratelimit";

export const runtime = "nodejs";

const Body = z.object({
  kind: z.enum(["heart", "report"]),
  /** Client-derived device hash. Dedupes votes; never identifies a person. */
  device: z.string().min(4).max(64),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ip = clientIp(await headers()) ?? "unknown";

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad vote." }, { status: 400 });
  }
  const { kind, device } = parsed.data;

  // castVote is the real one-vote-per-device guard; this only stops a flood,
  // and counts the device as well as the address so a spoofed header is not
  // enough to get a fresh quota.
  const cap = kind === "report" ? 20 : 120;
  if (
    !allowAll([
      { key: `vote:ip:${ip}`, limit: cap, windowMs: 60 * 1000 },
      { key: `vote:dev:${device}`, limit: cap, windowMs: 60 * 1000 },
    ])
  ) {
    return NextResponse.json({ error: "Too fast." }, { status: 429 });
  }

  try {
    const total = await castVote(id, device, kind);
    if (total === null) return NextResponse.json({ error: "Gone." }, { status: 404 });
    return NextResponse.json({ total });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
