"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Announcement } from "@/lib/announcement";

const DISMISSED = "cbc_dismissed_announcement";

const listeners = new Set<() => void>();

function subscribeDismissed(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function readDismissed(): string | null {
  try {
    return localStorage.getItem(DISMISSED);
  } catch {
    return null;
  }
}

function emitDismissed() {
  listeners.forEach((fn) => fn());
}

/** Fetched once by the page and handed to the banner, so a stage change does
 *  not re-request it. */
export function useAnnouncement(): Announcement | null {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    fetch("/api/announcement", { cache: "no-store", signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAnnouncement(d?.announcement ?? null))
      .catch(() => {});
    return () => ac.abort();
  }, []);

  return announcement;
}

/**
 * Admin banner. Sits in normal flow at the top of a panel so it pushes the
 * header down rather than covering it. Dismissal is remembered per
 * announcement, so closing one still leaves the next visible, and an `alert`
 * cannot be dismissed at all.
 */
export default function AnnouncementBanner({
  announcement,
}: {
  announcement: Announcement | null;
}) {
  // Read straight from storage rather than syncing it into state in an effect.
  // Null on the server, which keeps the banner out of the SSR markup.
  const dismissedId = useSyncExternalStore(subscribeDismissed, readDismissed, () => null);

  function dismiss() {
    if (!announcement) return;
    try {
      localStorage.setItem(DISMISSED, announcement.id);
    } catch {
      // Blocked storage just means it shows again next visit.
    }
    emitDismissed();
  }

  const alert = announcement?.level === "alert";
  const show = announcement && (alert || dismissedId !== announcement.id);

  return (
    <AnimatePresence initial={false}>
      {show && announcement && (
        <motion.div
          key={announcement.id}
          className="px-4 pt-[max(0.75rem,env(safe-area-inset-top))]"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div
            role={alert ? "alert" : "status"}
            className={`mx-auto flex max-w-lg items-start gap-3 rounded-2xl border px-4 py-3 shadow-sm backdrop-blur ${
              alert
                ? "border-maroon/40 bg-maroon text-[#fff4e6]"
                : "border-gold/45 bg-[#fdf3d8]/95 text-[#5c4a12]"
            }`}
          >
            <span aria-hidden className="mt-0.5 shrink-0 text-base">
              {alert ? "\u{1F4E3}" : "\u{2728}"}
            </span>

            <div className="min-w-0 flex-1 text-sm leading-relaxed">
              <p className="text-pretty">{announcement.message}</p>
              {announcement.link_url && (
                <a
                  href={announcement.link_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-1 inline-block font-medium underline underline-offset-2"
                >
                  {announcement.link_label || "Read more"}
                </a>
              )}
            </div>

            {!alert && (
              <button
                onClick={dismiss}
                aria-label="Dismiss announcement"
                className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg opacity-60 transition active:scale-95 hover:opacity-100"
              >
                {"✕"}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
