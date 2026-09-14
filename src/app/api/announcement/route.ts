import { NextResponse } from "next/server";
import { getAnnouncement } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ announcement: await getAnnouncement() });
  } catch {
    // A broken banner should never take the wall down with it.
    return NextResponse.json({ announcement: null });
  }
}
