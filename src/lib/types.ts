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

export const MOODS: { id: Mood; label: string; emoji: string; accent: string }[] = [
  { id: "crush", label: "Crush", emoji: "\u{1F495}", accent: "#ff5fa2" },
  { id: "guilt", label: "Guilt", emoji: "\u{1F62C}", accent: "#7c5cff" },
  { id: "rage", label: "Rage", emoji: "\u{1F621}", accent: "#ff6b35" },
  { id: "cringe", label: "Cringe", emoji: "\u{1F480}", accent: "#35d6a4" },
  { id: "neutral", label: "Neutral", emoji: "\u{1F4AC}", accent: "#4cc9f0" },
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
  hearts: number;
  created_at: string;
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
