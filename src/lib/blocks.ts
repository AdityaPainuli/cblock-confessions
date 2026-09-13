/**
 * Block registry.
 *
 * Two separate ideas here, and they are not the same list:
 *  - every block can SEND a confession (we ask where the author studies), and
 *  - only blocks with `receiving: true` can RECEIVE one.
 *
 * Right now C Block is the only wall that is open. The rest are listed so the
 * whole campus is visible from day one, but they are marked coming soon.
 */
export type BlockId = "A" | "B" | "C" | "D";

export type Block = {
  id: BlockId;
  label: string;
  /** Whether this block's wall accepts confessions yet. */
  receiving: boolean;
  /** Shown wherever a closed block appears. */
  note?: string;
  /**
   * Courses taught in this block. Only C Block is confirmed so far; the others
   * are filled in as we map them, and until then the course step is skipped.
   */
  courses: string[];
};

export const BLOCKS: Block[] = [
  { id: "A", label: "A Block", receiving: false, note: "Under construction", courses: [] },
  { id: "B", label: "B Block", receiving: false, note: "Under construction", courses: [] },
  {
    id: "C",
    label: "C Block",
    receiving: true,
    courses: ["B.Tech", "M.Tech", "BCA", "MCA"],
  },
  { id: "D", label: "D Block", receiving: false, note: "Under construction", courses: [] },
];

export const BLOCK_IDS = BLOCKS.map((b) => b.id) as [BlockId, ...BlockId[]];

export const OPEN_BLOCKS = BLOCKS.filter((b) => b.receiving);

export function getBlock(id: string): Block | undefined {
  return BLOCKS.find((b) => b.id === id);
}

export function coursesFor(id: string): string[] {
  return getBlock(id)?.courses ?? [];
}

/** All courses we currently know about, used to validate the submitted value. */
export const ALL_COURSES = Array.from(new Set(BLOCKS.flatMap((b) => b.courses)));
