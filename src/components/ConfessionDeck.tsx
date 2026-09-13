"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import ConfessionCard from "./ConfessionCard";
import { hasVoted, vote } from "@/lib/votes";
import type { Confession } from "@/lib/types";

const SWIPE_DISTANCE = 90;
const SWIPE_VELOCITY = 420;
/** Start fetching the next page while this many cards are still unread. */
const PREFETCH_AT = 6;

export default function ConfessionDeck({
  items,
  onNeedMore,
  exhausted,
}: {
  items: Confession[];
  onNeedMore: () => void;
  exhausted: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [reported, setReported] = useState<string | null>(null);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-240, 0, 240], [-12, 0, 12]);
  const likeOpacity = useTransform(x, [24, 120], [0, 1]);
  const skipOpacity = useTransform(x, [-120, -24], [1, 0]);

  // Reset to the top whenever the underlying list is swapped (tag/wall change).
  const firstId = items[0]?.id;
  const prevFirst = useRef(firstId);
  useEffect(() => {
    if (prevFirst.current !== firstId) {
      prevFirst.current = firstId;
      setIndex(0);
      x.set(0);
    }
  }, [firstId, x]);

  const remaining = items.length - index;
  useEffect(() => {
    if (!exhausted && remaining <= PREFETCH_AT) onNeedMore();
  }, [remaining, exhausted, onNeedMore]);

  const advance = useCallback(
    (direction: 1 | -1) => {
      const current = items[index];
      if (current && direction === 1) void vote(current.id, "heart");
      setIndex((i) => i + 1);
      x.set(0);
    },
    [items, index, x],
  );

  const report = useCallback(async () => {
    const current = items[index];
    if (!current) return;
    await vote(current.id, "report");
    setReported(current.id);
    setTimeout(() => {
      setReported(null);
      setIndex((i) => i + 1);
      x.set(0);
    }, 1100);
  }, [items, index, x]);

  if (!items.length) {
    return (
      <p className="px-6 text-center text-muted">
        No confessions yet. Be the first one out of C block.
      </p>
    );
  }

  if (index >= items.length) {
    return (
      <div className="px-6 text-center text-muted">
        <p className="text-lg">
          {exhausted ? "That's every secret on the wall." : "Loading more..."}
        </p>
        {exhausted && (
          <button
            onClick={() => setIndex(0)}
            className="mt-4 min-h-11 rounded-full border border-line px-5 py-2 text-sm text-foreground transition hover:bg-maroon/8"
          >
            Read them again
          </button>
        )}
      </div>
    );
  }

  const visible = items.slice(index, index + 3);

  return (
    <div className="relative h-[clamp(300px,52dvh,460px)] w-full max-w-md">
      <AnimatePresence initial={false}>
        {visible
          .map((c, i) => {
            const isTop = i === 0;
            return (
              <motion.div
                key={c.id}
                className="absolute inset-0"
                style={isTop ? { x, rotate, zIndex: 10, touchAction: "pan-y" } : { zIndex: 10 - i }}
                initial={{ scale: 0.92, y: 22, opacity: 0 }}
                animate={{ scale: 1 - i * 0.045, y: i * 12, opacity: 1 }}
                exit={{
                  x: x.get() > 0 ? 420 : -420,
                  opacity: 0,
                  transition: { duration: 0.24 },
                }}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                drag={isTop ? "x" : false}
                dragElastic={0.5}
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                  const far = Math.abs(info.offset.x) > SWIPE_DISTANCE;
                  const fast = Math.abs(info.velocity.x) > SWIPE_VELOCITY;
                  if (far || fast) advance(info.offset.x > 0 ? 1 : -1);
                }}
              >
                <ConfessionCard
                  c={c}
                  alreadyHearted={isTop && hasVoted(c.id, "heart")}
                  reported={reported === c.id}
                />
                {isTop && (
                  <>
                    <motion.span
                      style={{ opacity: likeOpacity }}
                      className="pointer-events-none absolute left-5 top-5 rounded-lg border-2 border-maroon px-3 py-1 text-base font-bold uppercase tracking-widest text-maroon"
                    >
                      felt that
                    </motion.span>
                    <motion.span
                      style={{ opacity: skipOpacity }}
                      className="pointer-events-none absolute right-5 top-5 rounded-lg border-2 border-muted/50 px-3 py-1 text-base font-bold uppercase tracking-widest text-muted"
                    >
                      nope
                    </motion.span>
                  </>
                )}
              </motion.div>
            );
          })
          .reverse()}
      </AnimatePresence>

      <div className="absolute -bottom-[4.5rem] left-0 right-0 flex items-center justify-center gap-4">
        <button
          onClick={() => advance(-1)}
          aria-label="Skip confession"
          className="grid h-14 w-14 place-items-center rounded-full border border-line bg-surface text-2xl text-muted shadow-sm transition active:scale-95 hover:text-foreground"
        >
          {"✕"}
        </button>
        <button
          onClick={() => advance(1)}
          aria-label="Heart confession"
          className="grid h-16 w-16 place-items-center rounded-full bg-maroon text-2xl text-[#fff4e6] shadow-[0_14px_34px_-12px_rgba(139,26,43,0.85)] transition active:scale-95 hover:brightness-110"
        >
          {"♥"}
        </button>
        <button
          onClick={report}
          aria-label="Report confession"
          title="Report this confession"
          className="grid h-14 w-14 place-items-center rounded-full border border-line bg-surface text-lg text-muted shadow-sm transition active:scale-95 hover:text-maroon"
        >
          {"⚑"}
        </button>
      </div>
    </div>
  );
}
