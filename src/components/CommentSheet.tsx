"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { deviceKey } from "@/lib/votes";
import { MAX_COMMENT, type Comment, type Confession } from "@/lib/types";

function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

/**
 * The thread under a confession. Anyone can read it; only people on the block
 * network can add to it, and the box says so rather than failing on submit.
 */
export default function CommentSheet({
  confession,
  onClose,
  onPosted,
  mayComment,
  commentGate,
}: {
  confession: Confession | null;
  onClose: () => void;
  onPosted: (id: string) => void;
  mayComment: boolean;
  commentGate: boolean;
}) {
  return (
    <AnimatePresence>
      {confession && (
        <Thread
          key={confession.id}
          confession={confession}
          onClose={onClose}
          onPosted={onPosted}
          mayComment={mayComment}
          commentGate={commentGate}
        />
      )}
    </AnimatePresence>
  );
}

function Thread({
  confession,
  onClose,
  onPosted,
  mayComment,
  commentGate,
}: {
  confession: Confession;
  onClose: () => void;
  onPosted: (id: string) => void;
  mayComment: boolean;
  commentGate: boolean;
}) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();

    fetch(`/api/confessions/${confession.id}/comments`, {
      cache: "no-store",
      signal: ac.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setComments(data?.comments ?? []))
      .catch(() => {
        // Aborted on close, or the network went. An empty thread is fine.
      });

    return () => ac.abort();
  }, [confession.id]);

  async function submit() {
    if (body.trim().length < 2) return setError("Say a little more than that.");
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/confessions/${confession.id}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: body.trim(), device: deviceKey() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not post that.");

      setComments((prev) => [...(prev ?? []), data.comment]);
      setBody("");
      onPosted(confession.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post that.");
    } finally {
      setSending(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-[#2f2419]/45 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        className="relative z-10 flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl border border-line bg-surface sm:rounded-3xl"
        initial={{ y: 60, opacity: 0, scale: 0.97 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
      >
        <header className="shrink-0 border-b border-line p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 flex-1 text-pretty text-sm leading-relaxed text-foreground">
              {confession.body}
            </p>
            <button
              onClick={onClose}
              aria-label="Close replies"
              className="-mr-1 -mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg text-muted transition active:scale-95"
            >
              {"✕"}
            </button>
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.18em] text-muted">
            {comments === null
              ? "Replies"
              : comments.length === 1
                ? "1 reply"
                : `${comments.length} replies`}
          </p>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
          {comments === null && <p className="text-sm text-muted">Loading...</p>}

          {comments?.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">
              No replies yet.{mayComment ? " Say something." : ""}
            </p>
          )}

          {comments?.map((c) => (
            <div key={c.id} className="rounded-2xl border border-line bg-[#fdf7ec] px-4 py-3">
              <p className="text-pretty text-sm leading-relaxed text-foreground">{c.body}</p>
              <p className="mt-1.5 text-[11px] text-muted">
                anonymous &middot; {timeAgo(c.created_at)}
              </p>
            </div>
          ))}
        </div>

        <footer className="shrink-0 border-t border-line p-4">
          {mayComment ? (
            <>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, MAX_COMMENT))}
                rows={2}
                placeholder="Reply anonymously..."
                className="w-full resize-none rounded-2xl border border-line bg-[#fdf7ec] p-3 text-foreground placeholder:text-muted/60 focus:border-maroon/60 focus:outline-none"
              />
              {error && <p className="mt-2 text-sm text-[#a32b2b]">{error}</p>}
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-muted">
                  {body.length}/{MAX_COMMENT}
                </span>
                <button
                  onClick={submit}
                  disabled={sending || body.trim().length < 2}
                  className="min-h-11 rounded-full bg-maroon px-6 text-sm font-medium text-[#fff4e6] transition active:scale-95 disabled:opacity-40"
                >
                  {sending ? "Posting..." : "Reply"}
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-line px-4 py-3 text-center">
              <p className="text-sm text-foreground">
                {"🚧"} Replies are for people on the block wifi
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {commentGate
                  ? "Connect to the block wifi to join in. Mobile data will not work, even standing in the building."
                  : "Not switched on yet."}
              </p>
            </div>
          )}
        </footer>
      </motion.div>
    </motion.div>
  );
}
