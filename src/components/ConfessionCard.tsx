"use client";

import { memo } from "react";
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

/** Long confessions get smaller type rather than a scrollbar on a phone. */
function sizeFor(length: number) {
  if (length > 420) return "text-base sm:text-lg";
  if (length > 220) return "text-lg sm:text-xl";
  return "text-xl sm:text-2xl";
}

function ConfessionCard({
  c,
  hearted,
  celebrating,
  reported,
}: {
  c: Confession;
  hearted?: boolean;
  /** Plays the burst for the beat between tapping heart and the card leaving. */
  celebrating?: boolean;
  reported?: boolean;
}) {
  const accent = MOOD_ACCENT[c.mood] ?? "#4a7b96";

  return (
    <div
      className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-3xl border border-line bg-surface p-5 sm:p-6"
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

      <p
        className={`my-5 flex-1 overflow-y-auto text-pretty leading-relaxed text-foreground ${sizeFor(
          c.body.length,
        )}`}
      >
        {c.body}
      </p>

      <div className="flex items-center justify-between text-sm text-muted">
        <span>anonymous &middot; C block</span>
        <span
          className={`flex items-center gap-1.5 font-medium transition-transform ${
            celebrating ? "scale-125" : ""
          }`}
          style={{ color: accent }}
        >
          {hearted ? "♥" : "♡"} {c.hearts}
        </span>
      </div>

      {celebrating && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 grid animate-[pop_520ms_ease-out] place-items-center text-7xl"
          style={{ color: accent }}
        >
          ♥
        </span>
      )}

      {reported && (
        <div className="absolute inset-0 grid place-items-center rounded-3xl bg-surface/95 px-6 text-center">
          <div>
            <div className="text-3xl">{"⚑"}</div>
            <p className="mt-2 font-medium text-foreground">Reported</p>
            <p className="mt-1 text-sm text-muted">A moderator will take a look.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(ConfessionCard);
