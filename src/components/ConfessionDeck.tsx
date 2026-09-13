"use client";

import { useState } from "react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import ConfessionCard from "./ConfessionCard";
import type { Confession } from "@/lib/types";

const SWIPE_DISTANCE = 110;
const SWIPE_VELOCITY = 500;

export default function ConfessionDeck({
  items,
  onHeart,
  onEmpty,
}: {
  items: Confession[];
  onHeart: (id: string) => void;
  onEmpty: () => void;
}) {
  const [index, setIndex] = useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-260, 0, 260], [-14, 0, 14]);
  const likeOpacity = useTransform(x, [30, 140], [0, 1]);
  const skipOpacity = useTransform(x, [-140, -30], [1, 0]);

  const visible = items.slice(index, index + 3);

  function advance(direction: 1 | -1) {
    const current = items[index];
    if (current && direction === 1) onHeart(current.id);
    const next = index + 1;
    setIndex(next);
    x.set(0);
    if (next >= items.length) onEmpty();
  }

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
        <p className="text-lg">That&apos;s every secret on the wall.</p>
        <button
          onClick={() => setIndex(0)}
          className="mt-4 rounded-full border border-line px-5 py-2 text-sm text-foreground transition hover:bg-maroon/8"
        >
          Read them again
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-[56vh] max-h-[480px] w-full max-w-md">
      <AnimatePresence initial={false}>
        {visible
          .map((c, i) => {
            const isTop = i === 0;
            return (
              <motion.div
                key={c.id}
                className="absolute inset-0"
                style={isTop ? { x, rotate, zIndex: 10 } : { zIndex: 10 - i }}
                initial={{ scale: 0.92, y: 22, opacity: 0 }}
                animate={{
                  scale: 1 - i * 0.045,
                  y: i * 14,
                  opacity: 1,
                }}
                exit={{
                  x: x.get() > 0 ? 420 : -420,
                  opacity: 0,
                  transition: { duration: 0.28 },
                }}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                drag={isTop ? "x" : false}
                dragElastic={0.55}
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(_, info) => {
                  const far = Math.abs(info.offset.x) > SWIPE_DISTANCE;
                  const fast = Math.abs(info.velocity.x) > SWIPE_VELOCITY;
                  if (far || fast) advance(info.offset.x > 0 ? 1 : -1);
                }}
              >
                <ConfessionCard c={c} />
                {isTop && (
                  <>
                    <motion.span
                      style={{ opacity: likeOpacity }}
                      className="pointer-events-none absolute left-6 top-6 rounded-lg border-2 border-maroon px-3 py-1 text-lg font-bold uppercase tracking-widest text-maroon"
                    >
                      felt that
                    </motion.span>
                    <motion.span
                      style={{ opacity: skipOpacity }}
                      className="pointer-events-none absolute right-6 top-6 rounded-lg border-2 border-muted/50 px-3 py-1 text-lg font-bold uppercase tracking-widest text-muted"
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

      <div className="absolute -bottom-24 left-0 right-0 flex items-center justify-center gap-5">
        <button
          onClick={() => advance(-1)}
          aria-label="Skip confession"
          className="grid h-14 w-14 place-items-center rounded-full border border-line bg-surface text-2xl text-muted shadow-sm transition hover:scale-110 hover:text-foreground"
        >
          {"✕"}
        </button>
        <button
          onClick={() => advance(1)}
          aria-label="Heart confession"
          className="grid h-16 w-16 place-items-center rounded-full bg-maroon text-2xl text-[#fff4e6] shadow-[0_14px_34px_-12px_rgba(139,26,43,0.85)] transition hover:scale-110"
        >
          {"♥"}
        </button>
      </div>
    </div>
  );
}
