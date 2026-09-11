"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { collectSignals } from "@/lib/signals";
import { MOODS, TAGS, type Mood } from "@/lib/types";

const MAX = 1000;

export default function ComposeSheet({
  open,
  onClose,
  onPosted,
}: {
  open: boolean;
  onClose: () => void;
  onPosted: () => void;
}) {
  const [body, setBody] = useState("");
  const [tag, setTag] = useState<string>("general");
  const [mood, setMood] = useState<Mood>("neutral");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    if (body.trim().length < 4) return setError("Say a little more than that.");
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/confessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: body.trim(), tag, mood, signals: collectSignals() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not post that.");
      setDone(true);
      setBody("");
      onPosted();
      setTimeout(() => {
        setDone(false);
        onClose();
      }, 1400);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post that.");
    } finally {
      setSending(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className="relative z-10 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-[#0d1119] p-6 sm:rounded-3xl"
            initial={{ y: 60, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
          >
            {done ? (
              <div className="py-12 text-center">
                <div className="text-5xl">{"\u{1F92B}"}</div>
                <p className="mt-4 text-lg text-white/85">It&apos;s on the wall.</p>
                <p className="mt-1 text-sm text-white/45">No name attached.</p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-white">Confess</h2>
                <p className="mt-1 text-sm text-white/45">
                  No login, no name, no way for readers to trace it back to you.
                </p>

                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, MAX))}
                  rows={5}
                  autoFocus
                  placeholder="What happened in C block..."
                  className="mt-4 w-full resize-none rounded-2xl border border-white/10 bg-white/5 p-4 text-white placeholder:text-white/25 focus:border-[#ff2f87]/60 focus:outline-none"
                />
                <div className="mt-1 text-right text-xs text-white/35">
                  {body.length}/{MAX}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {MOODS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMood(m.id)}
                      className="rounded-full border px-3 py-1.5 text-sm transition"
                      style={{
                        borderColor: mood === m.id ? m.accent : "rgba(255,255,255,0.12)",
                        color: mood === m.id ? m.accent : "rgba(255,255,255,0.6)",
                        background: mood === m.id ? `${m.accent}1a` : "transparent",
                      }}
                    >
                      {m.emoji} {m.label}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {TAGS.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTag(t)}
                      className={`rounded-full px-3 py-1.5 text-sm transition ${
                        tag === t
                          ? "bg-white/15 text-white"
                          : "bg-white/5 text-white/50 hover:bg-white/10"
                      }`}
                    >
                      #{t}
                    </button>
                  ))}
                </div>

                {error && <p className="mt-4 text-sm text-[#ff8080]">{error}</p>}

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 rounded-full border border-white/15 py-3 text-white/70 transition hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submit}
                    disabled={sending}
                    className="flex-[2] rounded-full bg-[#ff2f87] py-3 font-medium text-white shadow-[0_12px_40px_-12px_#ff2f87] transition hover:brightness-110 disabled:opacity-50"
                  >
                    {sending ? "Posting..." : "Post anonymously"}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
