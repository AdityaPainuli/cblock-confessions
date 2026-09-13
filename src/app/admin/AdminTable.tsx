"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type AdminRow = {
  id: string;
  body: string;
  tag: string;
  mood: string;
  to_block?: string;
  reports?: number;
  status: string;
  hearts: number;
  created_at: string;
  meta?: Record<string, string | number | null> | null;
};

const STATUS_STYLE: Record<string, string> = {
  approved: "bg-[#3f7d5e]/15 text-[#2f6047]",
  pending: "bg-gold/20 text-[#8a6f14]",
  rejected: "bg-maroon/12 text-maroon",
};

function Field({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="min-w-0">
      <dt className="text-[10px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className="truncate font-mono text-xs text-foreground">{String(value)}</dd>
    </div>
  );
}

export default function AdminTable({ rows, demo }: { rows: AdminRow[]; demo?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  const visible = useMemo(
    () =>
      rows.filter((r) => {
        if (filter !== "all" && r.status !== filter) return false;
        if (!q) return true;
        const hay = `${r.body} ${r.tag} ${JSON.stringify(r.meta ?? {})}`.toLowerCase();
        return hay.includes(q.toLowerCase());
      }),
    [rows, filter, q],
  );

  async function setStatus(id: string, status: string) {
    await fetch(`/api/admin/confessions/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/admin/confessions/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <main className="min-h-[100dvh] bg-background px-4 py-8 text-foreground sm:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">C Block admin</h1>
          <p className="text-sm text-muted">{rows.length} submissions logged</p>
        </div>
        <button
          onClick={logout}
          className="rounded-full border border-line px-4 py-2 text-sm text-muted hover:text-foreground"
        >
          Log out
        </button>
      </header>

      {demo && (
        <p className="mb-5 rounded-xl border border-gold/40 bg-gold/12 px-4 py-3 text-sm text-[#7a6212]">
          Demo mode: no Supabase credentials found, so this data lives in memory
          and disappears on restart. Fill in <code>.env.local</code> to persist.
        </p>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {["all", "approved", "pending", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3.5 py-1.5 text-sm ${
              filter === s ? "bg-maroon text-[#fff4e6]" : "border border-line bg-surface text-muted"
            }`}
          >
            {s}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search text, IP, city, device..."
          className="ml-auto w-full rounded-full border border-line bg-surface px-4 py-1.5 text-sm focus:outline-none sm:w-72"
        />
      </div>

      <div className="space-y-3">
        {visible.map((r) => {
          const m = r.meta ?? {};
          const isOpen = open === r.id;
          return (
            <article key={r.id} className="rounded-2xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] leading-relaxed text-foreground">{r.body}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className={`rounded px-2 py-0.5 ${STATUS_STYLE[r.status] ?? ""}`}>
                      {r.status}
                    </span>
                    <span className="rounded bg-maroon/10 px-2 py-0.5 text-maroon">
                      to {r.to_block ?? "C"}
                    </span>
                    <span>#{r.tag}</span>
                    <span>{r.mood}</span>
                    <span>{"♥"} {r.hearts}</span>
                    {!!r.reports && (
                      <span className="rounded bg-maroon/12 px-2 py-0.5 font-medium text-maroon">
                        {"⚑"} {r.reports} reported
                      </span>
                    )}
                    <span>{new Date(r.created_at).toLocaleString()}</span>
                  </p>
                </div>

                <div className="flex shrink-0 gap-2 text-xs">
                  {r.status !== "approved" && (
                    <button
                      onClick={() => setStatus(r.id, "approved")}
                      className="rounded-lg bg-[#3f7d5e]/15 px-3 py-1.5 text-[#2f6047] hover:bg-[#3f7d5e]/25"
                    >
                      Approve
                    </button>
                  )}
                  {r.status !== "rejected" && (
                    <button
                      onClick={() => setStatus(r.id, "rejected")}
                      className="rounded-lg bg-gold/20 px-3 py-1.5 text-[#8a6f14] hover:bg-gold/30"
                    >
                      Hide
                    </button>
                  )}
                  <button
                    onClick={() => remove(r.id)}
                    className="rounded-lg bg-maroon/12 px-3 py-1.5 text-maroon hover:bg-maroon/20"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setOpen(isOpen ? null : r.id)}
                    className="rounded-lg border border-line px-3 py-1.5 text-muted hover:text-foreground"
                  >
                    {isOpen ? "Hide origin" : "Origin"}
                  </button>
                </div>
              </div>

              {isOpen && !Object.keys(m).length && (
                <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
                  No origin data for this row. Seeded samples carry none.
                </p>
              )}

              {isOpen && Object.keys(m).length > 0 && (
                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
                  <Field label="From block" value={m.from_block} />
                  <Field label="Course" value={m.from_course} />
                  <Field label="IP" value={m.ip} />
                  <Field label="City" value={m.geo_city} />
                  <Field label="Region" value={m.geo_region} />
                  <Field label="Country" value={m.geo_country} />
                  <Field label="Postal" value={m.geo_postal} />
                  <Field label="ISP" value={m.geo_isp} />
                  <Field label="Geo source" value={m.geo_source} />
                  {m.geo_lat != null && m.geo_lon != null && (
                    <div>
                      <dt className="text-[10px] uppercase tracking-wider text-muted">Map</dt>
                      <dd>
                        <a
                          className="font-mono text-xs text-[#2f6b7d] underline"
                          href={`https://www.google.com/maps?q=${m.geo_lat},${m.geo_lon}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {m.geo_lat}, {m.geo_lon}
                        </a>
                      </dd>
                    </div>
                  )}
                  <Field label="Device" value={[m.device_vendor, m.device_model, m.device_type].filter(Boolean).join(" ")} />
                  <Field label="OS" value={[m.os, m.os_version].filter(Boolean).join(" ")} />
                  <Field label="Browser" value={[m.browser, m.browser_version].filter(Boolean).join(" ")} />
                  <Field label="Engine" value={m.engine} />
                  <Field label="Screen" value={m.screen} />
                  <Field label="Viewport" value={m.viewport} />
                  <Field label="DPR" value={m.pixel_ratio} />
                  <Field label="Timezone" value={m.timezone} />
                  <Field label="Languages" value={m.languages} />
                  <Field label="Platform" value={m.platform} />
                  <Field label="RAM (GB)" value={m.device_memory} />
                  <Field label="CPU cores" value={m.cpu_cores} />
                  <Field label="Touch points" value={m.touch_points} />
                  <Field label="GPU" value={m.gpu} />
                  <Field label="Fingerprint" value={m.fingerprint} />
                  <Field label="Referrer" value={m.referrer} />
                  <div className="col-span-2 sm:col-span-4">
                    <Field label="User agent" value={m.user_agent} />
                  </div>
                </dl>
              )}
            </article>
          );
        })}
        {!visible.length && <p className="text-muted">Nothing matches that filter.</p>}
      </div>
    </main>
  );
}
