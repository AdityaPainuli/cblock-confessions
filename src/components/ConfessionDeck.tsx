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
      <p className="px-6 text-center text-white/50">
        No confessions yet. Be the first one out of C block.
      </p>
    );
  }

  if (index >= items.length) {
    return (
      <div className="px-6 text-center text-white/60">
        <p className="text-lg">That&apos;s every secret on the wall.</p>
        <button
          onClick={() => setIndex(0)}
          className="mt-4 rounded-full border border-white/20 px-5 py-2 text-sm text-white/80 transition hover:bg-white/10"
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
                      className="pointer-events-none absolute left-6 top-6 rounded-lg border-2 border-[#ff5fa2] px-3 py-1 text-lg font-bold uppercase tracking-widest text-[#ff5fa2]"
                    >
                      felt that
                    </motion.span>
                    <motion.span
                      style={{ opacity: skipOpacity }}
                      className="pointer-events-none absolute right-6 top-6 rounded-lg border-2 border-white/50 px-3 py-1 text-lg font-bold uppercase tracking-widest text-white/60"
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
          className="grid h-14 w-14 place-items-center rounded-full border border-white/15 bg-white/5 text-2xl text-white/70 transition hover:scale-110 hover:bg-white/10"
        >
          {"✕"}
        </button>
        <button
          onClick={() => advance(1)}
          aria-label="Heart confession"
          className="grid h-16 w-16 place-items-center rounded-full bg-[#ff2f87] text-2xl text-white shadow-[0_12px_40px_-8px_#ff2f87] transition hover:scale-110"
        >
          {"♥"}
        </button>
      </div>
    </div>
  );
}
