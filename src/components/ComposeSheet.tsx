"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { collectSignals } from "@/lib/signals";
import { BLOCKS, coursesFor, type BlockId } from "@/lib/blocks";
import { MOODS, TAGS, type Mood } from "@/lib/types";

const MAX = 1000;

type Step = "who" | "write";

export default function ComposeSheet({
  open,
  onClose,
  onPosted,
  toBlock,
}: {
  open: boolean;
  onClose: () => void;
  onPosted: () => void;
  toBlock: BlockId;
}) {
  const [step, setStep] = useState<Step>("who");
  const [fromBlock, setFromBlock] = useState<BlockId | null>(null);
  const [fromCourse, setFromCourse] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [tag, setTag] = useState<string>("general");
  const [mood, setMood] = useState<Mood>("neutral");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const courses = useMemo(() => (fromBlock ? coursesFor(fromBlock) : []), [fromBlock]);
  const target = BLOCKS.find((b) => b.id === toBlock);

  function reset() {
    setStep("who");
    setFromBlock(null);
    setFromCourse(null);
    setBody("");
    setError(null);
  }

  function close() {
    reset();
    onClose();
  }

  async function submit() {
    if (!fromBlock) return setStep("who");
    if (body.trim().length < 4) return setError("Say a little more than that.");

    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/confessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body: body.trim(),
          tag,
          mood,
          fromBlock,
          fromCourse: fromCourse ?? undefined,
          toBlock,
          signals: collectSignals(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not post that.");
      setDone(true);
      setBody("");
      onPosted();
      setTimeout(() => {
        setDone(false);
        close();
      }, 1500);
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
          <div className="absolute inset-0 bg-[#2f2419]/45 backdrop-blur-sm" onClick={close} />

          <motion.div
            className="relative z-10 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-surface p-6 shadow-2xl sm:rounded-3xl"
            initial={{ y: 60, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
          >
            {done ? (
              <div className="py-12 text-center">
                <div className="text-5xl">{"\u{1F92B}"}</div>
                <p className="mt-4 text-lg text-foreground">
                  It&apos;s on the {target?.label ?? "C Block"} wall.
                </p>
                <p className="mt-1 text-sm text-muted">No name attached.</p>
              </div>
            ) : step === "who" ? (
              <>
                <h2 className="text-xl font-semibold text-foreground">Which block are you from?</h2>
                <p className="mt-1 text-sm text-muted">
                  Every block can confess. Your block is never shown on the confession.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-2.5">
                  {BLOCKS.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setFromBlock(b.id);
                        setFromCourse(null);
                      }}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        fromBlock === b.id
                          ? "border-maroon bg-maroon/10 text-maroon-deep"
                          : "border-line text-muted hover:text-foreground"
                      }`}
                    >
                      <span className="block text-base font-medium">{b.label}</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {b.courses.length ? b.courses.join(" · ") : "Courses being mapped"}
                      </span>
                    </button>
                  ))}
                </div>

                {courses.length > 0 && (
                  <>
                    <h3 className="mt-6 text-sm font-medium text-foreground">Your course</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {courses.map((c) => (
                        <button
                          key={c}
                          onClick={() => setFromCourse(fromCourse === c ? null : c)}
                          className={`min-h-10 rounded-full px-3.5 text-sm transition active:scale-95 ${
                            fromCourse === c
                              ? "bg-maroon text-[#fff4e6]"
                              : "border border-line text-muted hover:text-foreground"
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted">Optional.</p>
                  </>
                )}

                <h3 className="mt-6 text-sm font-medium text-foreground">Confessing to</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {BLOCKS.map((b) => (
                    <span
                      key={b.id}
                      className={`rounded-full px-3.5 py-1.5 text-sm ${
                        b.id === toBlock
                          ? "bg-maroon text-[#fff4e6]"
                          : "border border-line text-muted opacity-60"
                      }`}
                    >
                      {b.label}
                      {b.id !== toBlock && b.note ? ` · ${b.note}` : ""}
                    </span>
                  ))}
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={close}
                    className="min-h-12 flex-1 rounded-full border border-line text-muted transition active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setStep("write")}
                    disabled={!fromBlock}
                    className="min-h-12 flex-[2] rounded-full bg-maroon font-medium text-[#fff4e6] shadow-[0_12px_34px_-14px_rgba(139,26,43,0.9)] transition active:scale-95 disabled:opacity-40"
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => setStep("who")}
                  className="min-h-10 text-sm text-muted transition"
                >
                  {"←"} {BLOCKS.find((b) => b.id === fromBlock)?.label}
                  {fromCourse ? ` · ${fromCourse}` : ""}
                </button>

                <h2 className="mt-3 text-xl font-semibold text-foreground">
                  Confess to {target?.label ?? "C Block"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  No login, no name, no way for readers to trace it back to you.
                </p>

                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value.slice(0, MAX))}
                  rows={5}
                  autoFocus
                  placeholder={`What happened in ${target?.label ?? "C Block"}...`}
                  className="mt-4 w-full resize-none rounded-2xl border border-line bg-[#fdf7ec] p-4 text-foreground placeholder:text-muted/60 focus:border-maroon/60 focus:outline-none"
                />
                <div className="mt-1 text-right text-xs text-muted">
                  {body.length}/{MAX}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {MOODS.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMood(m.id)}
                      className="min-h-10 rounded-full border px-3.5 text-sm transition active:scale-95"
                      style={{
                        borderColor: mood === m.id ? m.accent : "rgba(93,64,40,0.18)",
                        color: mood === m.id ? m.accent : "#6d6051",
                        background: mood === m.id ? `${m.accent}1f` : "transparent",
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
                      className={`min-h-10 rounded-full px-3.5 text-sm transition active:scale-95 ${
                        tag === t
                          ? "bg-maroon text-[#fff4e6]"
                          : "border border-line text-muted hover:text-foreground"
                      }`}
                    >
                      #{t}
                    </button>
                  ))}
                </div>

                {error && <p className="mt-4 text-sm text-[#a32b2b]">{error}</p>}

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={close}
                    className="min-h-12 flex-1 rounded-full border border-line text-muted transition active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submit}
                    disabled={sending}
                    className="min-h-12 flex-[2] rounded-full bg-maroon font-medium text-[#fff4e6] shadow-[0_12px_34px_-14px_rgba(139,26,43,0.9)] transition active:scale-95 disabled:opacity-50"
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
