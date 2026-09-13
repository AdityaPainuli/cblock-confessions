import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { clientIp } from "@/lib/device";
import { castVote } from "@/lib/data";
import { allowWrite } from "@/lib/ratelimit";
import { isOnCampus } from "@/lib/campus";

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

  if (!isOnCampus(ip)) {
    return NextResponse.json(
      { error: "This wall is only open on the university network." },
      { status: 403 },
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad vote." }, { status: 400 });
  }
  const { kind, device } = parsed.data;

  // castVote is the real one-vote-per-device guard; this only stops a flood.
  // Reports are capped far tighter than hearts, since a handful of them pulls
  // a confession off the wall.
  if (!allowWrite(kind, ip, device)) {
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
