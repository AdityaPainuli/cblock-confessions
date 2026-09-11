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
  const accent = MOOD_ACCENT[c.mood] ?? "#4cc9f0";

  return (
    <div
      className="flex h-full w-full flex-col justify-between rounded-3xl border border-white/10 bg-[#0e131c]/92 p-6 backdrop-blur-xl"
      style={{ boxShadow: `0 24px 70px -30px ${accent}` }}
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-white/50">
        <span className="rounded-full px-2.5 py-1" style={{ background: `${accent}22`, color: accent }}>
          #{c.tag}
        </span>
        <span>{timeAgo(c.created_at)}</span>
      </div>

      <p className="my-6 flex-1 overflow-y-auto text-pretty text-[1.35rem] leading-relaxed text-white/90 sm:text-2xl">
        {c.body}
      </p>

      <div className="flex items-center justify-between text-sm text-white/45">
        <span>anonymous &middot; C block</span>
        <span className="flex items-center gap-1.5" style={{ color: accent }}>
          {"♥"} {c.hearts}
        </span>
      </div>
    </div>
  );
}
