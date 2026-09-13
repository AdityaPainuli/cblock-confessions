import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getAnnouncement } from "@/lib/data";
import { isOnCampus } from "@/lib/campus";
import { clientIp } from "@/lib/device";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isOnCampus(clientIp(await headers()))) {
    return NextResponse.json({ announcement: null }, { status: 403 });
  }

  try {
    return NextResponse.json({ announcement: await getAnnouncement() });
  } catch {
    // A broken banner should never take the wall down with it.
    return NextResponse.json({ announcement: null });
  }
}
