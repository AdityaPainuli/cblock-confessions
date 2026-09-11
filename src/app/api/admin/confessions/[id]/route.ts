import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { remove, setStatus } from "@/lib/data";

export const runtime = "nodejs";

const STATUSES = ["pending", "approved", "rejected"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { status } = await req.json().catch(() => ({}));
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: "Bad status." }, { status: 400 });
  }

  try {
    await setStatus(id, status);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await remove(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
