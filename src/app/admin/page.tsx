import { isAdmin } from "@/lib/auth";
import { hasSupabase, listAdmin } from "@/lib/data";
import LoginForm from "./LoginForm";
import AdminTable, { type AdminRow } from "./AdminTable";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdmin())) return <LoginForm />;

  let rows: AdminRow[];
  try {
    rows = (await listAdmin()) as AdminRow[];
  } catch (e) {
    return (
      <main className="p-10 text-rose-300">
        <p className="font-mono text-sm">Database error: {(e as Error).message}</p>
      </main>
    );
  }

  return <AdminTable rows={rows} demo={!hasSupabase()} />;
}
