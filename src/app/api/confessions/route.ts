import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { buildMeta, clientIp, geoLookup } from "@/lib/device";
import { create, listPublic } from "@/lib/data";
import { allow } from "@/lib/ratelimit";
import { TAGS } from "@/lib/types";
import { ALL_COURSES, BLOCK_IDS, getBlock } from "@/lib/blocks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  body: z.string().trim().min(4).max(1000),
  tag: z.enum(TAGS).default("general"),
  mood: z.enum(["guilt", "crush", "rage", "cringe", "neutral"]).default("neutral"),
  /** Where the author studies. Analytics only, never shown publicly. */
  fromBlock: z.enum(BLOCK_IDS),
  fromCourse: z.enum(ALL_COURSES as [string, ...string[]]).optional(),
  /** The wall being posted to. Checked against the open list below. */
  toBlock: z.enum(BLOCK_IDS),
  signals: z.record(z.string(), z.unknown()).default({}),
});

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  try {
    const toBlock = params.get("block") ?? "C";
    if (!getBlock(toBlock)?.receiving) {
      return NextResponse.json({ confessions: [] });
    }
    return NextResponse.json({ confessions: await listPublic(params.get("tag"), toBlock) });
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
  const { body, tag, mood, fromBlock, fromCourse, toBlock, signals } = parsed.data;

  const target = getBlock(toBlock);
  if (!target?.receiving) {
    return NextResponse.json(
      { error: `${target?.label ?? "That block"} is not open for confessions yet.` },
      { status: 400 },
    );
  }

  // A course only counts if it is actually taught in the author's own block.
  const courses = getBlock(fromBlock)?.courses ?? [];
  const course = fromCourse && courses.includes(fromCourse) ? fromCourse : undefined;

  try {
    const geo = await geoLookup(h, ip);
    const id = await create(
      { body, tag, mood, to_block: toBlock },
      { fromBlock, fromCourse: course },
      buildMeta(h, signals, geo, ip),
    );
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
