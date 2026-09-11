import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { buildMeta, clientIp, geoLookup } from "@/lib/device";
import { create, listPublic } from "@/lib/data";
import { allow } from "@/lib/ratelimit";
import { TAGS } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  body: z.string().trim().min(4).max(1000),
  tag: z.enum(TAGS).default("general"),
  mood: z.enum(["guilt", "crush", "rage", "cringe", "neutral"]).default("neutral"),
  signals: z.record(z.string(), z.unknown()).default({}),
});

export async function GET(req: Request) {
  try {
    const tag = new URL(req.url).searchParams.get("tag");
    return NextResponse.json({ confessions: await listPublic(tag) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const h = await headers();
  const ip = clientIp(h);

  if (!allow(`post:${ip ?? "unknown"}`, 5, 10 * 60 * 1000)) {
    return NextResponse.json(
      { error: "Slow down. Try again in a few minutes." },
      { status: 429 },
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That confession looks malformed." }, { status: 400 });
  }
  const { body, tag, mood, signals } = parsed.data;

  try {
    // Submission origin lands in a table the public anon key can never read.
    const geo = await geoLookup(h, ip);
    const id = await create({ body, tag, mood }, buildMeta(h, signals, geo, ip));
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
