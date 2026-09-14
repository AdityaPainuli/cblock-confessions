export type Mood = "guilt" | "crush" | "rage" | "cringe" | "neutral";

export const TAGS = [
  "general",
  "crush",
  "hostel",
  "attendance",
  "professors",
  "canteen",
  "exams",
  "friendship",
] as const;

export type Tag = (typeof TAGS)[number];

// Accents sit in the campus range: maroon, terracotta, sandstone green, slate.
export const MOODS: { id: Mood; label: string; emoji: string; accent: string }[] = [
  { id: "crush", label: "Crush", emoji: "\u{1F495}", accent: "#b23a5e" },
  { id: "guilt", label: "Guilt", emoji: "\u{1F62C}", accent: "#7d5ba6" },
  { id: "rage", label: "Rage", emoji: "\u{1F621}", accent: "#bf5227" },
  { id: "cringe", label: "Cringe", emoji: "\u{1F480}", accent: "#3f7d5e" },
  { id: "neutral", label: "Neutral", emoji: "\u{1F4AC}", accent: "#4a7b96" },
];

export const MOOD_ACCENT: Record<Mood, string> = MOODS.reduce(
  (acc, m) => ({ ...acc, [m.id]: m.accent }),
  {} as Record<Mood, string>,
);

export type Confession = {
  id: string;
  body: string;
  tag: string;
  mood: Mood;
  /** The wall this confession was posted to. */
  to_block: string;
  hearts: number;
  comments: number;
  created_at: string;
};

export type Comment = {
  id: string;
  body: string;
  created_at: string;
};

export const MAX_COMMENT = 400;

/**
 * Where the author studies. Collected for insight into which blocks are using
 * the wall; kept out of the public card so a confession stays unattributable.
 */
export type Origin = {
  fromBlock: string;
  fromCourse?: string;
};

/** Signals the browser hands us. Never shown in the public UI. */
export type ClientSignals = {
  screen?: string;
  viewport?: string;
  pixelRatio?: number;
  timezone?: string;
  languages?: string;
  platform?: string;
  deviceMemory?: number;
  cpuCores?: number;
  touchPoints?: number;
  gpu?: string;
  fingerprint?: string;
};
