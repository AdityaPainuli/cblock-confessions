import { headers } from "next/headers";
import { adminConfigured, isAdmin } from "@/lib/auth";
import { canComment, commentGateEnabled } from "@/lib/network";
import { clientIp } from "@/lib/device";
import {
  getAnnouncement,
  hasSupabase,
  listAdmin,
  listAdminComments,
  serverNow,
} from "@/lib/data";
import LoginForm from "./LoginForm";
import AdminTable, { type AdminRow } from "./AdminTable";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!adminConfigured()) {
    return (
      <main className="min-h-[100dvh] bg-background px-6 py-16 text-foreground">
        <div className="mx-auto max-w-md">
          <h1 className="text-xl font-semibold">Admin is not set up yet</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Set <code>ADMIN_PASSWORD</code> and <code>ADMIN_SESSION_SECRET</code> in
            this deployment&apos;s environment variables, then redeploy.
            <code className="mt-3 block rounded-lg bg-surface px-3 py-2 font-mono text-xs">
              openssl rand -hex 32
            </code>
          </p>
        </div>
      </main>
    );
  }

  if (!(await isAdmin())) return <LoginForm />;

  let rows: AdminRow[];
  let comments: Awaited<ReturnType<typeof listAdminComments>> = [];
  let announcement = null;
  try {
    rows = (await listAdmin()) as AdminRow[];
    comments = await listAdminComments();
    announcement = await getAnnouncement();
  } catch (e) {
    return (
      <main className="min-h-[100dvh] bg-background p-10 text-maroon">
        <p className="font-mono text-sm">Database error: {(e as Error).message}</p>
      </main>
    );
  }

  const ip = clientIp(await headers());
  const now = await serverNow();

  return (
    <AdminTable
      rows={rows}
      demo={!hasSupabase()}
      announcement={announcement}
      comments={comments}
      now={now}
      network={{ ip, gated: commentGateEnabled(), allowed: canComment(ip) }}
    />
  );
}
