import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { buildMeta, clientIp, geoLookup } from "@/lib/device";
import { create, listPublic } from "@/lib/data";
import { allowWrite } from "@/lib/ratelimit";
import { isOnCampus } from "@/lib/campus";
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

const OFF_CAMPUS = {
  error: "This wall is only open on the university network.",
  offCampus: true,
} as const;

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;

  // The page gate would be trivial to walk around by calling this directly.
  if (!isOnCampus(clientIp(await headers()))) {
    return NextResponse.json(OFF_CAMPUS, { status: 403 });
  }

  try {
    const toBlock = params.get("block") ?? "C";
    if (!getBlock(toBlock)?.receiving) {
      return NextResponse.json({ confessions: [], nextCursor: null });
    }

    const sort = params.get("sort") === "top" ? "top" : "latest";
    const page = await listPublic(params.get("tag"), toBlock, sort, params.get("cursor"));
    return NextResponse.json({ confessions: page.items, nextCursor: page.nextCursor });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const h = await headers();
  const ip = clientIp(h);

  if (!isOnCampus(ip)) return NextResponse.json(OFF_CAMPUS, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That confession looks malformed." }, { status: 400 });
  }
  const { body, tag, mood, fromBlock, fromCourse, toBlock, signals } = parsed.data;

  // The whole campus shares a handful of addresses, so the device quota is the
  // one that bites; the address quota is only there to stop a flood.
  const device = typeof signals.fingerprint === "string" ? signals.fingerprint : "unknown";
  if (!allowWrite("post", ip ?? "unknown", device)) {
    return NextResponse.json(
      { error: "Slow down. Try again in a few minutes." },
      { status: 429 },
    );
  }

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
