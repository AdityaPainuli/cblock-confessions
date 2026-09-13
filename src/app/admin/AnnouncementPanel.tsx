"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_MESSAGE, type Announcement, type AnnouncementLevel } from "@/lib/announcement";

/**
 * Lets the admin put a banner on the site: an event, a deadline, a heads-up.
 * One is live at a time; posting a new one retires the last.
 */
export default function AnnouncementPanel({ current }: { current: Announcement | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [level, setLevel] = useState<AnnouncementLevel>("info");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    if (message.trim().length < 2) return setError("Write something first.");
    setBusy(true);
    setError(null);

    const res = await fetch("/api/admin/announcement", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        message: message.trim(),
        level,
        linkUrl: linkUrl.trim() || undefined,
        linkLabel: linkLabel.trim() || undefined,
      }),
    });
    setBusy(false);

    if (!res.ok) return setError((await res.json()).error ?? "Could not publish.");
    setMessage("");
    setLinkUrl("");
    setLinkLabel("");
    setOpen(false);
    router.refresh();
  }

  async function clear() {
    setBusy(true);
    await fetch("/api/admin/announcement", { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <section className="mb-5 rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Site announcement</h2>
          {current ? (
            <p className="mt-1 text-sm text-muted">
              <span
                className={`mr-2 rounded px-2 py-0.5 text-xs font-medium ${
                  current.level === "alert"
                    ? "bg-maroon/12 text-maroon"
                    : "bg-gold/20 text-[#7a6212]"
                }`}
              >
                {current.level}
              </span>
              {current.message}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted">
              Nothing showing. Use this for events, deadlines or downtime.
            </p>
          )}
        </div>

        <div className="flex shrink-0 gap-2 text-xs">
          <button
            onClick={() => setOpen((v) => !v)}
            className="min-h-9 rounded-lg border border-line px-3 text-muted transition hover:text-foreground"
          >
            {open ? "Close" : current ? "Replace" : "New"}
          </button>
          {current && (
            <button
              onClick={clear}
              disabled={busy}
              className="min-h-9 rounded-lg bg-maroon/12 px-3 text-maroon transition hover:bg-maroon/20 disabled:opacity-50"
            >
              Take down
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="mt-4 border-t border-line pt-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
            rows={2}
            placeholder="Tech fest registrations close Friday..."
            className="w-full resize-none rounded-xl border border-line bg-[#fdf7ec] p-3 text-foreground placeholder:text-muted/60 focus:border-maroon/60 focus:outline-none"
          />
          <div className="mt-1 text-right text-xs text-muted">
            {message.length}/{MAX_MESSAGE}
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://... (optional link)"
              className="min-h-11 rounded-xl border border-line bg-[#fdf7ec] px-3 text-foreground placeholder:text-muted/60 focus:border-maroon/60 focus:outline-none"
            />
            <input
              value={linkLabel}
              onChange={(e) => setLinkLabel(e.target.value.slice(0, 40))}
              placeholder="Link label (optional)"
              className="min-h-11 rounded-xl border border-line bg-[#fdf7ec] px-3 text-foreground placeholder:text-muted/60 focus:border-maroon/60 focus:outline-none"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(["info", "alert"] as AnnouncementLevel[]).map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`min-h-9 rounded-full px-3.5 text-sm transition ${
                  level === l
                    ? "bg-maroon text-[#fff4e6]"
                    : "border border-line text-muted hover:text-foreground"
                }`}
              >
                {l}
              </button>
            ))}
            <span className="text-xs text-muted">
              {level === "alert"
                ? "Readers cannot dismiss an alert."
                : "Readers can dismiss this once."}
            </span>

            <button
              onClick={publish}
              disabled={busy}
              className="ml-auto min-h-10 rounded-full bg-maroon px-5 text-sm font-medium text-[#fff4e6] transition active:scale-95 disabled:opacity-50"
            >
              {busy ? "Publishing..." : "Publish"}
            </button>
          </div>

          {error && <p className="mt-3 text-sm text-[#a32b2b]">{error}</p>}
        </div>
      )}
    </section>
  );
}
