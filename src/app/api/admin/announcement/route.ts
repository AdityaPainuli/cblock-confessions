import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/auth";
import { clearAnnouncement, setAnnouncement } from "@/lib/data";
import { MAX_MESSAGE } from "@/lib/announcement";

export const runtime = "nodejs";

const Body = z.object({
  message: z.string().trim().min(2).max(MAX_MESSAGE),
  level: z.enum(["info", "alert"]).default("info"),
  // Only http(s), so a banner can never carry a javascript: or data: URL.
  linkUrl: z.string().trim().url().startsWith("http").max(500).optional().or(z.literal("")),
  linkLabel: z.string().trim().max(40).optional(),
});

export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "That announcement looks malformed." }, { status: 400 });
  }

  try {
    const announcement = await setAnnouncement({
      message: parsed.data.message,
      level: parsed.data.level,
      linkUrl: parsed.data.linkUrl || undefined,
      linkLabel: parsed.data.linkLabel || undefined,
    });
    return NextResponse.json({ announcement }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await clearAnnouncement();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
