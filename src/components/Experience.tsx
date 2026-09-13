"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import ComposeSheet from "./ComposeSheet";
import ConfessionDeck from "./ConfessionDeck";
import CampusFallback from "./CampusFallback";
import AnnouncementBanner, { useAnnouncement } from "./AnnouncementBanner";
import { useDeviceTier } from "@/lib/useDeviceTier";
import { BLOCKS, getBlock, type BlockId } from "@/lib/blocks";
import { TAGS, type Confession } from "@/lib/types";
import { FLIGHT_MS } from "@/lib/flight";
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
  const announcement = useAnnouncement();
  const [stage, setStage] = useState<Stage>("campus");
  const [wall, setWall] = useState<BlockId>("C");
  const [showPanel, setShowPanel] = useState(false);

  const [items, setItems] = useState<Confession[]>(initial);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [tag, setTag] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("latest");
  const [composing, setComposing] = useState(false);

  const request = useRef(0);
  const loadingMore = useRef(false);

  /** Replaces the feed. Used whenever a filter or the chosen wall changes. */
  const reload = useCallback(async (next: { tag: string; wall: BlockId; sort: Sort }) => {
    const ticket = ++request.current;
    const q = new URLSearchParams({ block: next.wall, sort: next.sort });
    if (next.tag !== "all") q.set("tag", next.tag);

    const res = await fetch(`/api/confessions?${q}`, { cache: "no-store" });
    if (!res.ok || ticket !== request.current) return;

    const data = await res.json();
    setItems(data.confessions ?? []);
    setCursor(data.nextCursor ?? null);
  }, []);

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

  /** Counts the heart locally so the number moves the instant it is tapped. */
  const bumpHearts = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, hearts: c.hearts + 1 } : c)),
    );
  }, []);

  const pick = useCallback(
    (next: Partial<{ tag: string; sort: Sort }>) => {
      const merged = { tag, sort, ...next };
      setTag(merged.tag);
      setSort(merged.sort);
      void reload({ ...merged, wall }).catch(() => {});
    },
    [tag, sort, wall, reload],
  );

  /**
   * Moves to a stage and holds the UI back until the camera has finished
   * flying, so the move is something you watch rather than something hidden
   * behind a panel fading in over it.
   */
  const panelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goTo = useCallback((next: Stage) => {
    if (panelTimer.current) clearTimeout(panelTimer.current);
    setShowPanel(false);
    setStage(next);
    if (next === "campus") return;
    panelTimer.current = setTimeout(() => setShowPanel(true), FLIGHT_MS[next]);
  }, []);

  useEffect(() => () => {
    if (panelTimer.current) clearTimeout(panelTimer.current);
  }, []);

  /** Campus overview -> the block chooser. */
  const toBlocks = useCallback(() => goTo("blocks"), [goTo]);

  /** Block chooser -> that block's wall. */
  const openWall = useCallback(
    (id: BlockId) => {
      if (!getBlock(id)?.receiving) return;
      setWall(id);
      goTo("wall");
      // Fetch during the flight, so the deck is ready the moment it lands.
      void reload({ tag, sort, wall: id }).catch(() => {});
    },
    [goTo, reload, tag, sort],
  );

  const back = useCallback(() => {
    goTo(stage === "wall" ? "blocks" : "campus");
  }, [goTo, stage]);

  // Wheel and keyboard get you off the landing too, not just the swipe.
  useEffect(() => {
    if (stage !== "campus") return;
    const onWheel = (e: WheelEvent) => e.deltaY > 24 && toBlocks();
    const onKey = (e: KeyboardEvent) =>
      (e.key === "ArrowUp" || e.key === "Enter") && toBlocks();
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [stage, toBlocks]);

  const activeWall = getBlock(wall);
  const veiled = showPanel && stage !== "campus";
  const flying = stage !== "campus" && !showPanel;

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0">
        {tier === "high" || tier === "medium" ? (
          <CampusScene stage={stage} block={wall} tier={tier} />
        ) : tier === "low" ? (
          <CampusFallback stage={stage} />
        ) : null}
      </div>

      <div
        className="pointer-events-none absolute inset-0 bg-[#f6ecdc] transition-opacity duration-700"
        style={{ opacity: veiled ? (stage === "wall" ? 0.74 : 0.58) : 0 }}
      />

      {/* Names the destination while the camera is still on its way there. */}
      <AnimatePresence>
        {flying && (
          <motion.div
            key="flying"
            className="pointer-events-none absolute inset-x-0 top-[38%] z-20 text-center"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
          >
            <span className="rounded-full bg-surface/85 px-5 py-2 text-xs uppercase tracking-[0.3em] text-maroon-deep shadow-sm backdrop-blur">
              {stage === "wall" ? `Entering ${activeWall?.label}` : "Galgotias University"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------------------- */}
      {/* Landing: the university first, the wall second.                   */}
      {/* ---------------------------------------------------------------- */}
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
              onDragEnd={(_, info) => info.offset.y < -60 && toBlocks()}
            />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#f4ece0] via-[#f4ece0]/86 to-transparent" />

            <div className="pointer-events-none relative z-10 flex h-full flex-col items-center justify-end px-5 pb-[max(3rem,env(safe-area-inset-bottom))] text-center">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.7 }}
              >
                <h1 className="text-[clamp(1.9rem,8.5vw,3.6rem)] font-bold leading-[1.02] tracking-tight">
                  GALGOTIAS
                  <span className="block">UNIVERSITY</span>
                  <span className="mt-1 block bg-gradient-to-r from-maroon to-terracotta bg-clip-text text-[clamp(1.35rem,6vw,2.5rem)] tracking-[0.16em] text-transparent">
                    CONFESSIONS
                  </span>
                </h1>
                <p className="mt-4 text-sm text-muted sm:text-base">
                  Everything nobody says out loud in the corridor.
                </p>

                <button
                  onClick={toBlocks}
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

      {/* ---------------------------------------------------------------- */}
      {/* Block chooser. Only C is finished; the rest are building sites.   */}
      {/* ---------------------------------------------------------------- */}
      <AnimatePresence>
        {stage === "blocks" && showPanel && (
          <motion.section
            key="blocks"
            className="absolute inset-0 flex flex-col"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 28 }}
            transition={{ duration: 0.45 }}
          >
            <div className="pt-[max(0.25rem,env(safe-area-inset-top))]" />
            <AnnouncementBanner announcement={announcement} />

            <header className="px-4 pt-3">
              <button
                onClick={back}
                className="min-h-11 rounded-full border border-line bg-surface/80 px-4 text-sm text-foreground backdrop-blur transition active:scale-95"
              >
                {"←"} campus
              </button>
            </header>

            <div className="flex flex-1 flex-col justify-center px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
              <p className="text-center text-[11px] uppercase tracking-[0.34em] text-muted">
                Galgotias University
              </p>
              <h2 className="mt-2 text-center text-[clamp(1.6rem,7vw,2.4rem)] font-bold leading-tight">
                Pick a block
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-center text-sm text-muted">
                Only C Block is open so far. The rest of the campus is still going up.
              </p>

              <div className="mx-auto mt-7 grid w-full max-w-md grid-cols-2 gap-3">
                {BLOCKS.map((b, i) => (
                  <motion.button
                    key={b.id}
                    onClick={() => openWall(b.id)}
                    disabled={!b.receiving}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 * i, duration: 0.35 }}
                    className={`relative flex min-h-[8rem] flex-col overflow-hidden rounded-3xl border p-4 text-left transition ${
                      b.receiving
                        ? "border-maroon/35 bg-surface shadow-[0_18px_44px_-28px_rgba(139,26,43,0.85)] active:scale-[0.98]"
                        : "cursor-not-allowed border-dashed border-line bg-surface/55"
                    }`}
                  >
                    <span
                      className={`block text-lg font-semibold ${
                        b.receiving ? "text-foreground" : "text-muted"
                      }`}
                    >
                      {b.label}
                    </span>

                    {b.receiving ? (
                      <>
                        <span className="mt-1 block flex-1 text-xs leading-relaxed text-muted">
                          {b.courses.join(" · ")}
                        </span>
                        <span className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-maroon px-3 py-1 text-xs font-medium text-[#fff4e6]">
                          Open · read &amp; confess
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="mt-1 block flex-1 text-xs text-muted">
                          Courses being mapped
                        </span>
                        <span className="mt-3 inline-flex w-fit items-center gap-1.5 text-xs uppercase tracking-wide text-muted/80">
                          {"🚧"} {b.note}
                        </span>
                      </>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ---------------------------------------------------------------- */}
      {/* The wall itself.                                                  */}
      {/* ---------------------------------------------------------------- */}
      <AnimatePresence>
        {stage === "wall" && showPanel && (
          <motion.section
            key="wall"
            className="absolute inset-0 flex flex-col"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ duration: 0.45 }}
          >
            <div className="pt-[max(0.25rem,env(safe-area-inset-top))]" />
            <AnnouncementBanner announcement={announcement} />

            <header className="flex items-center justify-between gap-3 px-4 pt-3">
              <button
                onClick={back}
                className="min-h-11 shrink-0 rounded-full border border-line bg-surface/80 px-4 text-sm text-foreground backdrop-blur transition active:scale-95"
              >
                {"←"} {activeWall?.label}
              </button>

              <div className="flex shrink-0 rounded-full border border-line bg-surface/80 p-0.5 backdrop-blur">
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

            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
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
              <ConfessionDeck
                items={items}
                onHeart={bumpHearts}
                onNeedMore={loadMore}
                exhausted={!cursor}
              />
            </div>

            <div className="mx-auto mb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-2">
              <button
                onClick={() => setComposing(true)}
                className="min-h-12 rounded-full bg-gradient-to-r from-maroon to-terracotta px-8 font-medium text-[#fff4e6] shadow-[0_16px_44px_-18px_rgba(139,26,43,0.9)] transition active:scale-95"
              >
                Confess to {activeWall?.label}
              </button>
              <a
                href="/privacy"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-muted underline underline-offset-2"
              >
                What this site records
              </a>
            </div>
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
