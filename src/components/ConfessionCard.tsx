"use client";

import { MOOD_ACCENT, type Confession } from "@/lib/types";

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export default function ConfessionCard({ c }: { c: Confession }) {
  const accent = MOOD_ACCENT[c.mood] ?? "#4a7b96";

  return (
    <div
      className="flex h-full w-full flex-col justify-between rounded-3xl border border-line bg-surface p-6"
      style={{ boxShadow: `0 26px 60px -34px ${accent}, 0 2px 10px rgba(93,64,40,0.08)` }}
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-muted">
        <span
          className="rounded-full px-2.5 py-1 font-medium"
          style={{ background: `${accent}1f`, color: accent }}
        >
          #{c.tag}
        </span>
        <span>{timeAgo(c.created_at)}</span>
      </div>

      <p className="my-6 flex-1 overflow-y-auto text-pretty text-[1.35rem] leading-relaxed text-foreground sm:text-2xl">
        {c.body}
      </p>

      <div className="flex items-center justify-between text-sm text-muted">
        <span>anonymous &middot; C block</span>
        <span className="flex items-center gap-1.5 font-medium" style={{ color: accent }}>
          {"♥"} {c.hearts}
        </span>
      </div>
    </div>
  );
}
