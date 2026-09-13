"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ComposeSheet from "./ComposeSheet";
import ConfessionDeck from "./ConfessionDeck";
import CampusFallback from "./CampusFallback";
import { useDeviceTier } from "@/lib/useDeviceTier";
import { BLOCKS, type BlockId } from "@/lib/blocks";
import { TAGS, type Confession } from "@/lib/types";
import type { Stage } from "./three/CampusScene";

// Only pulled when the device can actually run it, which keeps three.js off
// the wire entirely for low-tier phones.
const CampusScene = dynamic(() => import("./three/CampusScene"), { ssr: false });

type Sort = "latest" | "top";

export default function Experience({
  initial,
  initialCursor,
}: {
  initial: Confession[];
  initialCursor: string | null;
}) {
  const tier = useDeviceTier();
  const [stage, setStage] = useState<Stage>("campus");
  const [showFeed, setShowFeed] = useState(false);
  const [items, setItems] = useState<Confession[]>(initial);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [tag, setTag] = useState<string>("all");
  const [wall, setWall] = useState<BlockId>("C");
  const [sort, setSort] = useState<Sort>("latest");
  const [composing, setComposing] = useState(false);

  const request = useRef(0);
  const loadingMore = useRef(false);

  /** Replaces the feed. Used whenever a filter changes. */
  const reload = useCallback(
    async (next: { tag: string; wall: BlockId; sort: Sort }) => {
      const ticket = ++request.current;
      const q = new URLSearchParams({ block: next.wall, sort: next.sort });
      if (next.tag !== "all") q.set("tag", next.tag);

      const res = await fetch(`/api/confessions?${q}`, { cache: "no-store" });
      if (!res.ok || ticket !== request.current) return;

      const data = await res.json();
      setItems(data.confessions ?? []);
      setCursor(data.nextCursor ?? null);
    },
    [],
  );

  /** Appends the next page. Called by the deck as the reader nears the end. */
  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore.current) return;
    loadingMore.current = true;

    const ticket = request.current;
    const q = new URLSearchParams({ block: wall, sort, cursor });
    if (tag !== "all") q.set("tag", tag);

    try {
      const res = await fetch(`/api/confessions?${q}`, { cache: "no-store" });
      if (!res.ok || ticket !== request.current) return;

      const data = await res.json();
      // Guard against a page arriving twice and duplicating keys in the deck.
      setItems((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...(data.confessions ?? []).filter((c: Confession) => !seen.has(c.id))];
      });
      setCursor(data.nextCursor ?? null);
    } finally {
      loadingMore.current = false;
    }
  }, [cursor, wall, sort, tag]);

  const pick = useCallback(
    (next: Partial<{ tag: string; wall: BlockId; sort: Sort }>) => {
      const merged = { tag, wall, sort, ...next };
      setTag(merged.tag);
      setWall(merged.wall);
      setSort(merged.sort);
      void reload(merged).catch(() => {});
    },
    [tag, wall, sort, reload],
  );

  const enter = useCallback(() => {
    setStage((s) => (s === "block" ? s : "block"));
    setTimeout(() => setShowFeed(true), 1000);
  }, []);

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

  const activeWall = BLOCKS.find((b) => b.id === wall);

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0">
        {tier === "high" || tier === "medium" ? (
          <CampusScene stage={stage} tier={tier} />
        ) : tier === "low" ? (
          <CampusFallback stage={stage} />
        ) : null}
      </div>

      <div
        className="pointer-events-none absolute inset-0 bg-[#f6ecdc] transition-opacity duration-700"
        style={{ opacity: showFeed ? 0.74 : 0 }}
      />

      <AnimatePresence>
        {stage === "campus" && (
          <motion.div
            key="gate"
            className="absolute inset-0"
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.5 }}
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
              onDragEnd={(_, info) => info.offset.y < -60 && enter()}
            />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#f4ece0] via-[#f4ece0]/86 to-transparent" />

            <div className="pointer-events-none relative z-10 flex h-full flex-col items-center justify-end px-5 pb-[max(3rem,env(safe-area-inset-bottom))] text-center">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.7 }}
              >
                <p className="text-[11px] uppercase tracking-[0.36em] text-muted sm:text-xs sm:tracking-[0.42em]">
                  Galgotias University
                </p>
                <h1 className="mt-3 text-[clamp(2.5rem,13vw,4.5rem)] font-bold leading-[0.95] tracking-tight">
                  C BLOCK
                  <span className="block bg-gradient-to-r from-maroon to-terracotta bg-clip-text text-transparent">
                    CONFESSIONS
                  </span>
                </h1>
                <p className="mt-4 text-sm text-muted sm:text-base">
                  Everything nobody says out loud in the corridor.
                </p>

                <button
                  onClick={enter}
                  className="pointer-events-auto mt-8 min-h-12 rounded-full border border-line bg-surface/85 px-7 py-3 text-sm uppercase tracking-[0.2em] text-maroon-deep shadow-sm backdrop-blur transition active:scale-95 hover:bg-surface"
                >
                  Swipe up to enter
                </button>

                <motion.div
                  className="mt-5 text-2xl text-muted"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
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
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ duration: 0.45 }}
          >
            <header className="flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))]">
              <button
                onClick={exit}
                className="min-h-11 rounded-full border border-line bg-surface/80 px-4 text-sm text-foreground backdrop-blur transition active:scale-95"
              >
                {"←"} campus
              </button>

              <div className="flex rounded-full border border-line bg-surface/80 p-0.5 backdrop-blur">
                {(["latest", "top"] as Sort[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => pick({ sort: s })}
                    className={`min-h-10 rounded-full px-3.5 text-sm transition ${
                      sort === s ? "bg-maroon text-[#fff4e6]" : "text-muted"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </header>

            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4">
              {BLOCKS.map((b) => (
                <button
                  key={b.id}
                  onClick={() => b.receiving && pick({ wall: b.id })}
                  disabled={!b.receiving}
                  title={b.receiving ? undefined : b.note}
                  className={`min-h-10 shrink-0 rounded-full px-3.5 text-sm transition ${
                    wall === b.id
                      ? "bg-maroon text-[#fff4e6]"
                      : b.receiving
                        ? "border border-line bg-surface/80 text-muted backdrop-blur"
                        : "cursor-not-allowed border border-dashed border-line text-muted/60"
                  }`}
                >
                  {b.label}
                  {!b.receiving && (
                    <span className="ml-1.5 text-[11px] uppercase tracking-wide">{b.note}</span>
                  )}
                </button>
              ))}
            </div>

            <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto px-4 pb-1">
              {["all", ...TAGS].map((t) => (
                <button
                  key={t}
                  onClick={() => pick({ tag: t })}
                  className={`min-h-10 shrink-0 rounded-full px-3.5 text-sm transition ${
                    tag === t
                      ? "bg-maroon text-[#fff4e6]"
                      : "border border-line bg-surface/80 text-muted backdrop-blur"
                  }`}
                >
                  {t === "all" ? "everything" : `#${t}`}
                </button>
              ))}
            </div>

            <div className="flex flex-1 items-center justify-center px-4 pb-20">
              <ConfessionDeck items={items} onNeedMore={loadMore} exhausted={!cursor} />
            </div>

            <button
              onClick={() => setComposing(true)}
              className="mx-auto mb-[max(1.5rem,env(safe-area-inset-bottom))] min-h-12 rounded-full bg-gradient-to-r from-maroon to-terracotta px-8 font-medium text-[#fff4e6] shadow-[0_16px_44px_-18px_rgba(139,26,43,0.9)] transition active:scale-95"
            >
              Confess to {activeWall?.label ?? "C Block"}
            </button>
          </motion.section>
        )}
      </AnimatePresence>

      <ComposeSheet
        open={composing}
        onClose={() => setComposing(false)}
        onPosted={() => reload({ tag, wall, sort })}
        toBlock={wall}
      />
    </main>
  );
}
