import { isAdmin } from "@/lib/auth";
import { getAnnouncement, hasSupabase, listAdmin } from "@/lib/data";
import LoginForm from "./LoginForm";
import AdminTable, { type AdminRow } from "./AdminTable";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) return <LoginForm />;

  let rows: AdminRow[];
  let announcement = null;
  try {
    rows = (await listAdmin()) as AdminRow[];
    announcement = await getAnnouncement();
  } catch (e) {
    return (
      <main className="min-h-[100dvh] bg-background p-10 text-maroon">
        <p className="font-mono text-sm">Database error: {(e as Error).message}</p>
      </main>
    );
  }

  return <AdminTable rows={rows} demo={!hasSupabase()} announcement={announcement} />;
}
