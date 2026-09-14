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
/** Long enough to watch the heart land before the card leaves. */
const LIKE_BEAT_MS = 520;

export default function ConfessionDeck({
  items,
  onHeart,
  onOpenReplies,
  onNeedMore,
  exhausted,
}: {
  items: Confession[];
  onHeart: (id: string) => void;
  onOpenReplies: (c: Confession) => void;
  onNeedMore: () => void;
  exhausted: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState<string | null>(null);
  const [reported, setReported] = useState<string | null>(null);
  // Which way the card leaves: right for a heart, left for a skip. Buttons set
  // it explicitly, since a tap leaves the drag position at zero.
  const [exitDir, setExitDir] = useState<1 | -1>(1);
  const busy = useRef(false);

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

  const next = useCallback(
    (direction: 1 | -1 = -1) => {
      setExitDir(direction);
      setIndex((i) => i + 1);
      x.set(0);
    },
    [x],
  );

  /**
   * Hearting holds the card in place for a beat so the count visibly ticks up
   * and the burst plays, then lets it go. Without that the card leaves on the
   * same frame and a like looks like it did nothing.
   */
  const heart = useCallback(() => {
    const current = items[index];
    if (!current || busy.current) return;

    if (hasVoted(current.id, "heart")) {
      next(1);
      return;
    }

    busy.current = true;
    setLiked(current.id);
    onHeart(current.id);
    void vote(current.id, "heart");

    setTimeout(() => {
      setLiked(null);
      busy.current = false;
      next(1);
    }, LIKE_BEAT_MS);
  }, [items, index, onHeart, next]);

  const report = useCallback(async () => {
    const current = items[index];
    if (!current || busy.current) return;

    busy.current = true;
    await vote(current.id, "report");
    setReported(current.id);

    setTimeout(() => {
      setReported(null);
      busy.current = false;
      next(-1);
    }, 1100);
  }, [items, index, next]);

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
  const topId = items[index]?.id;
  const topLiked = liked === topId || (topId ? hasVoted(topId, "heart") : false);

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
                  x: (x.get() || exitDir) > 0 ? 460 : -460,
                  rotate: (x.get() || exitDir) > 0 ? 16 : -16,
                  opacity: 0,
                  transition: { duration: 0.26 },
                }}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                drag={isTop && !liked ? "x" : false}
                dragElastic={0.5}
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                  const far = Math.abs(info.offset.x) > SWIPE_DISTANCE;
                  const fast = Math.abs(info.velocity.x) > SWIPE_VELOCITY;
                  if (!far && !fast) return;
                  if (info.offset.x > 0) heart();
                  else next(-1);
                }}
              >
                <ConfessionCard
                  c={c}
                  hearted={isTop ? topLiked : hasVoted(c.id, "heart")}
                  celebrating={liked === c.id}
                  reported={reported === c.id}
                  onOpenReplies={isTop ? () => onOpenReplies(c) : undefined}
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
          onClick={() => next(-1)}
          aria-label="Skip confession"
          className="grid h-14 w-14 place-items-center rounded-full border border-line bg-surface text-2xl text-muted shadow-sm transition active:scale-95 hover:text-foreground"
        >
          {"✕"}
        </button>

        <motion.button
          onClick={heart}
          aria-label={topLiked ? "Already hearted" : "Heart confession"}
          aria-pressed={topLiked}
          animate={topLiked ? { scale: [1, 1.28, 1] } : { scale: 1 }}
          transition={{ duration: 0.42 }}
          className="grid h-16 w-16 place-items-center rounded-full bg-maroon text-2xl text-[#fff4e6] shadow-[0_14px_34px_-12px_rgba(139,26,43,0.85)] transition active:scale-95 hover:brightness-110"
        >
          {topLiked ? "♥" : "♡"}
        </motion.button>

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
