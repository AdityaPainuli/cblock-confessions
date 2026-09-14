"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AnnouncementPanel from "./AnnouncementPanel";
import OriginPanel from "./OriginPanel";
import StatCard from "./StatCard";
import type { Announcement } from "@/lib/announcement";
import type { AdminComment } from "@/lib/data";

export type AdminRow = {
  id: string;
  body: string;
  tag: string;
  mood: string;
  to_block?: string;
  status: string;
  hearts: number;
  reports?: number;
  comments?: number;
  created_at: string;
  meta?: Record<string, string | number | null> | null;
};

const STATUS_STYLE: Record<string, string> = {
  approved: "bg-[#3f7d5e]/15 text-[#2f6047]",
  pending: "bg-gold/25 text-[#7a6212]",
  rejected: "bg-maroon/12 text-maroon",
};

/** `now` comes from the server render, so this stays pure and hydrates cleanly. */
function since(iso: string, now: number) {
  const mins = Math.round((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function AdminTable({
  rows,
  demo,
  announcement,
  comments,
  network,
  now,
}: {
  rows: AdminRow[];
  demo?: boolean;
  announcement: Announcement | null;
  comments: AdminComment[];
  network: { ip?: string; gated: boolean; allowed: boolean };
  /** Server render time, so relative dates do not drift on hydration. */
  now: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [tab, setTab] = useState<"confessions" | "replies">("confessions");
  const [q, setQ] = useState("");

  const stats = useMemo(() => {
    const dayAgo = now - 86_400_000;
    return {
      total: rows.length,
      today: rows.filter((r) => new Date(r.created_at).getTime() > dayAgo).length,
      pending: rows.filter((r) => r.status === "pending").length,
      reported: rows.filter((r) => (r.reports ?? 0) > 0).length,
      located: rows.filter((r) => r.meta?.precise_lat != null).length,
      replies: comments.length,
    };
  }, [rows, comments, now]);

  const visible = useMemo(
    () =>
      rows.filter((r) => {
        if (filter === "flagged" ? !(r.reports ?? 0) : filter !== "all" && r.status !== filter)
          return false;
        if (!q) return true;
        return `${r.body} ${r.tag} ${JSON.stringify(r.meta ?? {})}`
          .toLowerCase()
          .includes(q.toLowerCase());
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

  async function removeReply(id: string) {
    await fetch(`/api/admin/comments/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <main className="min-h-[100dvh] bg-background pb-16 text-foreground">
      <div className="mx-auto w-full max-w-5xl px-4 pt-8 sm:px-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted">
              Galgotias University
            </p>
            <h1 className="mt-1 text-2xl font-semibold">Confessions admin</h1>
          </div>
          <button
            onClick={logout}
            className="min-h-10 rounded-full border border-line px-4 text-sm text-muted transition hover:text-foreground"
          >
            Log out
          </button>
        </header>

        {demo && (
          <p className="mt-5 rounded-xl border border-gold/40 bg-gold/12 px-4 py-3 text-sm text-[#7a6212]">
            Demo mode: no database connected, so this data lives in memory and
            disappears on restart.
          </p>
        )}

        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Confessions" value={stats.total} />
          <StatCard label="Last 24h" value={stats.today} />
          <StatCard label="Replies" value={stats.replies} />
          <StatCard
            label="Pending"
            value={stats.pending}
            tone={stats.pending ? "warn" : "plain"}
            hint={stats.pending ? "needs review" : undefined}
          />
          <StatCard
            label="Reported"
            value={stats.reported}
            tone={stats.reported ? "alert" : "plain"}
          />
          <StatCard
            label="Exact GPS"
            value={stats.located}
            hint={`of ${stats.total}`}
          />
        </section>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <AnnouncementPanel current={announcement} />

          <section className="mb-5 rounded-2xl border border-line bg-surface p-4">
            <h2 className="text-sm font-semibold">Reply network gate</h2>
            {network.gated ? (
              <p className="mt-1 text-sm leading-relaxed text-muted">
                On. Only <code>COMMENT_IP_RANGES</code> can reply; reading and
                confessing are open to all. You are at{" "}
                <code className="rounded bg-[#fdf7ec] px-1.5 py-0.5 font-mono text-xs text-foreground">
                  {network.ip ?? "unknown"}
                </code>
                ,{" "}
                <span className={network.allowed ? "text-[#2f6047]" : "text-maroon"}>
                  {network.allowed ? "inside" : "outside"}
                </span>{" "}
                the allowlist.
              </p>
            ) : (
              <p className="mt-1 text-sm leading-relaxed text-muted">
                Off &mdash; anyone can reply. To limit replies to the block, open this
                page on that wifi and set <code>COMMENT_IP_RANGES</code> to the range
                this address belongs to:
                <code className="mt-2 block rounded-lg bg-[#fdf7ec] px-3 py-2 font-mono text-xs text-foreground">
                  {network.ip ?? "unknown"}
                </code>
              </p>
            )}
          </section>
        </div>

        <nav className="mt-2 flex gap-2 border-b border-line">
          {(["confessions", "replies"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px min-h-11 border-b-2 px-4 text-sm capitalize transition ${
                tab === t
                  ? "border-maroon font-medium text-maroon"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              {t}
              <span className="ml-1.5 text-xs text-muted">
                {t === "confessions" ? rows.length : comments.length}
              </span>
            </button>
          ))}
        </nav>

        {tab === "confessions" ? (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {["all", "approved", "pending", "rejected", "flagged"].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`min-h-9 rounded-full px-3.5 text-sm capitalize transition ${
                    filter === s
                      ? "bg-maroon text-[#fff4e6]"
                      : "border border-line bg-surface text-muted hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search text, IP, city, device..."
                className="ml-auto min-h-9 w-full rounded-full border border-line bg-surface px-4 text-sm focus:border-maroon/50 focus:outline-none sm:w-72"
              />
            </div>

            <div className="mt-4 space-y-3">
              {visible.map((r) => {
                const isOpen = open === r.id;
                const exact = r.meta?.precise_lat != null;
                return (
                  <article
                    key={r.id}
                    className={`rounded-2xl border bg-surface p-4 transition ${
                      (r.reports ?? 0) > 0 ? "border-maroon/35" : "border-line"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] leading-relaxed">{r.body}</p>
                        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                          <span
                            className={`rounded px-2 py-0.5 font-medium ${
                              STATUS_STYLE[r.status] ?? ""
                            }`}
                          >
                            {r.status}
                          </span>
                          <span className="rounded bg-maroon/10 px-2 py-0.5 text-maroon">
                            to {r.to_block ?? "C"}
                          </span>
                          <span>#{r.tag}</span>
                          <span>{r.mood}</span>
                          <span>{"♥"} {r.hearts}</span>
                          {!!r.comments && <span>{r.comments} replies</span>}
                          {!!r.reports && (
                            <span className="rounded bg-maroon/12 px-2 py-0.5 font-medium text-maroon">
                              {"⚑"} {r.reports}
                            </span>
                          )}
                          {exact && (
                            <span className="rounded bg-[#3f7d5e]/15 px-2 py-0.5 font-medium text-[#2f6047]">
                              {"📍"} exact
                            </span>
                          )}
                          <span title={new Date(r.created_at).toLocaleString()}>
                            {since(r.created_at, now)}
                          </span>
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-1.5 text-xs">
                        {r.status !== "approved" && (
                          <button
                            onClick={() => setStatus(r.id, "approved")}
                            className="min-h-9 rounded-lg bg-[#3f7d5e]/15 px-3 text-[#2f6047] transition hover:bg-[#3f7d5e]/25"
                          >
                            Approve
                          </button>
                        )}
                        {r.status !== "rejected" && (
                          <button
                            onClick={() => setStatus(r.id, "rejected")}
                            className="min-h-9 rounded-lg bg-gold/20 px-3 text-[#7a6212] transition hover:bg-gold/30"
                          >
                            Hide
                          </button>
                        )}
                        <button
                          onClick={() => remove(r.id)}
                          className="min-h-9 rounded-lg bg-maroon/12 px-3 text-maroon transition hover:bg-maroon/20"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setOpen(isOpen ? null : r.id)}
                          className="min-h-9 rounded-lg border border-line px-3 text-muted transition hover:text-foreground"
                        >
                          {isOpen ? "Hide origin" : "Origin"}
                        </button>
                      </div>
                    </div>

                    {isOpen && <OriginPanel meta={r.meta ?? {}} />}
                  </article>
                );
              })}

              {!visible.length && (
                <p className="rounded-2xl border border-dashed border-line py-10 text-center text-muted">
                  Nothing matches that filter.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="mt-5 space-y-2">
            {comments.map((c) => {
              const m = (c.meta ?? {}) as Record<string, string | number | null>;
              return (
                <article
                  key={c.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-line bg-surface p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-relaxed">{c.body}</p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span title={new Date(c.created_at).toLocaleString()}>
                        {since(c.created_at, now)}
                      </span>
                      {!!m.ip && <span className="font-mono">{String(m.ip)}</span>}
                      {!!m.geo_city && <span>{String(m.geo_city)}</span>}
                      {!!m.browser && <span>{String(m.browser)}</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => removeReply(c.id)}
                    className="min-h-9 shrink-0 rounded-lg bg-maroon/12 px-3 text-xs text-maroon transition hover:bg-maroon/20"
                  >
                    Delete
                  </button>
                </article>
              );
            })}

            {!comments.length && (
              <p className="rounded-2xl border border-dashed border-line py-10 text-center text-muted">
                No replies yet.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
