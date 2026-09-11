import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { clientIp } from "@/lib/device";
import { heart } from "@/lib/data";
import { allow } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ip = clientIp(await headers()) ?? "unknown";

  if (!allow(`heart:${ip}:${id}`, 3, 60 * 1000)) {
    return NextResponse.json({ error: "Already counted." }, { status: 429 });
  }

  try {
    return NextResponse.json({ hearts: await heart(id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
