import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { UAParser } from "ua-parser-js";
import { clientIp, geoLookup } from "@/lib/device";
import { createComment, listComments } from "@/lib/data";
import { canComment } from "@/lib/network";
import { allowWrite } from "@/lib/ratelimit";
import { MAX_COMMENT } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  body: z.string().trim().min(2).max(MAX_COMMENT),
  device: z.string().min(4).max(64).optional(),
});

/** Threads are readable by anyone, wherever they are. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    return NextResponse.json({ comments: await listComments(id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

/** Writing one is limited to the block network. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const h = await headers();
  const ip = clientIp(h);

  if (!canComment(ip)) {
    return NextResponse.json(
      {
        error: "Replies are open to people on the block wifi.",
        offNetwork: true,
      },
      { status: 403 },
    );
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That reply looks malformed." }, { status: 400 });
  }
  const { body, device = "unknown" } = parsed.data;

  if (!allowWrite("comment", ip ?? "unknown", device)) {
    return NextResponse.json({ error: "Slow down." }, { status: 429 });
  }

  try {
    // Enough to trace a reply that turns nasty, and no more than that.
    const ua = h.get("user-agent") ?? "";
    const parsedUa = UAParser(ua);
    const geo = await geoLookup(h, ip);

    const comment = await createComment(id, body, {
      ip,
      device_key: device,
      user_agent: ua,
      geo_city: geo.geo_city,
      geo_region: geo.geo_region,
      geo_country: geo.geo_country,
      browser: parsedUa.browser.name,
    });

    if (!comment) {
      return NextResponse.json({ error: "That confession is gone." }, { status: 404 });
    }
    return NextResponse.json({ comment }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
