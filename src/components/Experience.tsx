"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ComposeSheet from "./ComposeSheet";
import ConfessionDeck from "./ConfessionDeck";
import CampusFallback from "./CampusFallback";
import { useDeviceTier } from "@/lib/useDeviceTier";
import { TAGS, type Confession } from "@/lib/types";
import type { Stage } from "./three/CampusScene";

const CampusScene = dynamic(() => import("./three/CampusScene"), {
  ssr: false,
});

export default function Experience({ initial }: { initial: Confession[] }) {
  const tier = useDeviceTier();
  const [stage, setStage] = useState<Stage>("campus");
  const [showFeed, setShowFeed] = useState(false);
  const [items, setItems] = useState<Confession[]>(initial);
  const [tag, setTag] = useState<string>("all");
  const [composing, setComposing] = useState(false);
  const request = useRef(0);

  // The first page already arrives rendered from the server, so this only runs
  // when the visitor changes tag or posts something.
  const load = useCallback(async (t: string) => {
    const ticket = ++request.current;
    const q = t === "all" ? "" : `?tag=${encodeURIComponent(t)}`;
    const res = await fetch(`/api/confessions${q}`, { cache: "no-store" });
    // A slower earlier request must not overwrite a newer one.
    if (res.ok && ticket === request.current) {
      setItems((await res.json()).confessions ?? []);
    }
  }, []);

  const pickTag = useCallback(
    (t: string) => {
      setTag(t);
      void load(t).catch(() => {});
    },
    [load],
  );

  const enter = useCallback(() => {
    if (stage === "block") return;
    setStage("block");
    setTimeout(() => setShowFeed(true), 1100);
  }, [stage]);

  const exit = useCallback(() => {
    setShowFeed(false);
    setStage("campus");
  }, []);

  // Wheel and keyboard get you in too, not just the swipe.
  useEffect(() => {
    if (stage !== "campus") return;
    const onWheel = (e: WheelEvent) => e.deltaY > 24 && enter();
    const onKey = (e: KeyboardEvent) =>
      (e.key === "ArrowUp" || e.key === "Enter") && enter();
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [stage, enter]);

  async function heart(id: string) {
    setItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, hearts: c.hearts + 1 } : c)),
    );
    await fetch(`/api/confessions/${id}/heart`, { method: "POST" }).catch(
      () => {},
    );
  }

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-[#070b12] text-white">
      <div className="absolute inset-0">
        {tier === "high" ? (
          <CampusScene stage={stage} />
        ) : tier === "low" ? (
          <CampusFallback stage={stage} />
        ) : null}
      </div>

      {/* darkening veil once you are inside the block */}
      <div
        className="pointer-events-none absolute inset-0 bg-[#05070c] transition-opacity duration-700"
        style={{ opacity: showFeed ? 0.55 : 0 }}
      />

      <AnimatePresence>
        {stage === "campus" && (
          <motion.div
            key="gate"
            className="absolute inset-0"
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.6 }}
          >
            {/*
              The swipe surface sits behind the content. Framer captures the
              pointer while dragging, which would otherwise retarget the click
              away from the button sitting inside it.
            */}
            <motion.div
              className="absolute inset-0 z-0"
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              dragMomentum={false}
              onDragEnd={(_, info) => info.offset.y < -70 && enter()}
            />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-[#05070c] via-[#05070c]/85 to-transparent" />

            <div className="pointer-events-none relative z-10 flex h-full flex-col items-center justify-end pb-16 text-center">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="relative px-6"
              >
                <p className="text-xs uppercase tracking-[0.42em] text-white/45">
                  Galgotias University
                </p>
                <h1 className="mt-3 text-5xl font-bold tracking-tight sm:text-7xl">
                  C BLOCK
                  <span className="block bg-gradient-to-r from-[#ff2f87] to-[#7c5cff] bg-clip-text text-transparent">
                    CONFESSIONS
                  </span>
                </h1>
                <p className="mt-4 text-white/55">
                  Everything nobody says out loud in the corridor.
                </p>

                <button
                  onClick={enter}
                  className="pointer-events-auto mt-10 rounded-full bg-white/10 px-7 py-3 text-sm uppercase tracking-[0.2em] backdrop-blur transition hover:bg-white/20"
                >
                  Swipe up to enter
                </button>

                <motion.div
                  className="mt-6 text-2xl text-white/40"
                  animate={{ y: [0, -10, 0] }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.8,
                    ease: "easeInOut",
                  }}
                >
                  {"↑"}
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFeed && (
          <motion.section
            key="feed"
            className="absolute inset-0 flex flex-col"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.55 }}
          >
            <header className="flex items-center justify-between px-5 pt-5">
              <button
                onClick={exit}
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
              >
                {"←"} campus
              </button>
              <span className="text-xs uppercase tracking-[0.3em] text-white/45">
                C Block wall
              </span>
            </header>

            <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-5 pb-1">
              {["all", ...TAGS].map((t) => (
                <button
                  key={t}
                  onClick={() => pickTag(t)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm transition ${
                    tag === t
                      ? "bg-white text-black"
                      : "bg-white/8 text-white/60 hover:bg-white/15"
                  }`}
                >
                  {t === "all" ? "everything" : `#${t}`}
                </button>
              ))}
            </div>

            <div className="flex flex-1 items-center justify-center px-5 pb-24">
              <ConfessionDeck
                items={items}
                onHeart={heart}
                onEmpty={() => {}}
              />
            </div>

            <button
              onClick={() => setComposing(true)}
              className="mx-auto mb-7 rounded-full bg-gradient-to-r from-[#ff2f87] to-[#7c5cff] px-8 py-3.5 font-medium shadow-[0_16px_50px_-16px_#ff2f87] transition hover:brightness-110"
            >
              Drop a confession
            </button>
          </motion.section>
        )}
      </AnimatePresence>

      <ComposeSheet
        open={composing}
        onClose={() => setComposing(false)}
        onPosted={() => load(tag)}
      />
    </main>
  );
}
