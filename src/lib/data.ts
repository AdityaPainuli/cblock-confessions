import "server-only";
import { randomUUID } from "crypto";
import { createAdminClient } from "./supabase/admin";
import type { Comment, Confession, Mood, Origin } from "./types";
import type { Announcement, AnnouncementLevel } from "./announcement";

export type MetaRow = Record<string, unknown> & { confession_id: string };
export type AdminConfession = Confession & {
  status: string;
  reports: number;
  meta?: Record<string, unknown> | null;
};

export type AdminComment = Comment & {
  confession_id: string;
  status: string;
  reports: number;
  meta?: Record<string, unknown> | null;
};

export type Sort = "latest" | "top";
export type Page = { items: Confession[]; nextCursor: string | null };

/** How many reports it takes for a confession to leave the wall for review. */
export const REPORT_THRESHOLD = 3;

const PAGE_SIZE = 20;

/**
 * Without Supabase credentials the site runs on an in-memory store seeded with
 * sample confessions, so `npm run dev` works before any backend exists. It
 * resets on every server restart; set the env vars for real persistence.
 */
export function hasSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  // Ignore the placeholders shipped in .env.example so a half-filled env file
  // falls back to demo mode instead of throwing on every request.
  return (
    url.startsWith("https://") && !url.includes("xxxx") && key.length > 20
  );
}

const SEED: Omit<AdminConfession, "meta">[] = [
  {
    id: randomUUID(),
    body: "I have been sitting in the wrong section for three weeks and the professor still marks me present. At this point it is my section.",
    tag: "attendance",
    reports: 0,
    comments: 0,
    mood: "cringe",
    to_block: "C",
    status: "approved",
    hearts: 42,
    created_at: new Date(Date.now() - 36e5).toISOString(),
  },
  {
    id: randomUUID(),
    body: "Whoever plays guitar on the C block stairs at 6pm, I plan my whole evening around walking past. That is all.",
    tag: "crush",
    reports: 0,
    comments: 0,
    mood: "crush",
    to_block: "C",
    status: "approved",
    hearts: 118,
    created_at: new Date(Date.now() - 9e6).toISOString(),
  },
  {
    id: randomUUID(),
    body: "I told my group I finished my part of the project. I have not opened the file. The presentation is tomorrow. Pray for me.",
    tag: "exams",
    reports: 0,
    comments: 0,
    mood: "guilt",
    to_block: "C",
    status: "approved",
    hearts: 87,
    created_at: new Date(Date.now() - 18e6).toISOString(),
  },
  {
    id: randomUUID(),
    body: "The canteen samosa went from 15 to 25 rupees and nobody is protesting. This is the real crisis on campus.",
    tag: "canteen",
    reports: 0,
    comments: 0,
    mood: "rage",
    to_block: "C",
    status: "approved",
    hearts: 203,
    created_at: new Date(Date.now() - 26e6).toISOString(),
  },
];

type MemoryStore = {
  confessions: AdminConfession[];
  comments: AdminComment[];
  meta: Map<string, Record<string, unknown>>;
  /** `${confessionId}:${deviceKey}:${kind}` for one-vote-per-device. */
  votes: Set<string>;
  /** The banner currently on the site, if the admin has set one. */
  announcement: Announcement | null;
};

/**
 * Route handlers and server components are bundled separately, so a plain
 * module-level object would give each of them its own copy. Hanging the demo
 * store off globalThis keeps them looking at the same data.
 */
const globalStore = globalThis as typeof globalThis & {
  __cbcMemory?: MemoryStore;
};

const memory: MemoryStore = (globalStore.__cbcMemory ??= {
  confessions: [...SEED],
  comments: [],
  meta: new Map(),
  votes: new Set(),
  announcement: null,
});

export async function listPublic(
  tag?: string | null,
  toBlock: string = "C",
  sort: Sort = "latest",
  cursor?: string | null,
): Promise<Page> {
  const order = (a: Confession, b: Confession) =>
    sort === "top"
      ? b.hearts - a.hearts || b.created_at.localeCompare(a.created_at)
      : b.created_at.localeCompare(a.created_at);

  if (!hasSupabase()) {
    const all = memory.confessions
      .filter(
        (c) =>
          c.status === "approved" &&
          c.to_block === toBlock &&
          (!tag || tag === "all" || c.tag === tag),
      )
      .sort(order)
      .map((c) => ({
        id: c.id,
        body: c.body,
        tag: c.tag,
        mood: c.mood,
        to_block: c.to_block,
        hearts: c.hearts,
        comments: c.comments,
        created_at: c.created_at,
      }));

    const start = cursor ? Number(cursor) || 0 : 0;
    const items = all.slice(start, start + PAGE_SIZE);
    const next = start + PAGE_SIZE;
    return { items, nextCursor: next < all.length ? String(next) : null };
  }

  const from = cursor ? Number(cursor) || 0 : 0;
  let query = createAdminClient()
    .from("confessions")
    .select("id, body, tag, mood, to_block, hearts, comments, created_at")
    .eq("status", "approved")
    .eq("to_block", toBlock)
    .range(from, from + PAGE_SIZE - 1);

  query =
    sort === "top"
      ? query.order("hearts", { ascending: false }).order("created_at", { ascending: false })
      : query.order("created_at", { ascending: false });

  if (tag && tag !== "all") query = query.eq("tag", tag);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const items = (data ?? []) as Confession[];
  return {
    items,
    nextCursor: items.length === PAGE_SIZE ? String(from + PAGE_SIZE) : null,
  };
}

export async function create(
  input: { body: string; tag: string; mood: Mood; to_block: string },
  origin: Origin,
  meta: Record<string, unknown>,
): Promise<string> {
  // The author's own block never reaches the public row; it lives in the
  // admin-only meta table alongside the rest of the submission context.
  const fullMeta = {
    ...meta,
    from_block: origin.fromBlock,
    from_course: origin.fromCourse,
  };

  if (!hasSupabase()) {
    const id = randomUUID();
    memory.confessions.unshift({
      id,
      ...input,
      status: "approved",
      hearts: 0,
      reports: 0,
      comments: 0,
      created_at: new Date().toISOString(),
    });
    memory.meta.set(id, fullMeta);
    return id;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("confessions")
    .insert({ ...input, status: "approved" })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Insert failed.");

  await supabase.from("confession_meta").insert({ confession_id: data.id, ...fullMeta });
  return data.id;
}

/**
 * Records a heart or a report from one device. Voting twice from the same
 * browser is a no-op, so the counts mean something. Returns the new total, or
 * null if the confession has gone.
 */
export async function castVote(
  id: string,
  deviceKey: string,
  kind: "heart" | "report",
): Promise<number | null> {
  if (!hasSupabase()) {
    const c = memory.confessions.find((x) => x.id === id);
    if (!c) return null;

    const key = `${id}:${deviceKey}:${kind}`;
    if (memory.votes.has(key)) return kind === "heart" ? c.hearts : c.reports;
    memory.votes.add(key);

    if (kind === "heart") {
      c.hearts += 1;
      return c.hearts;
    }

    c.reports += 1;
    if (c.reports >= REPORT_THRESHOLD) c.status = "pending";
    return c.reports;
  }

  const { data, error } = await createAdminClient().rpc("cast_vote", {
    cid: id,
    device: deviceKey,
    vote: kind,
  });
  if (error) throw new Error(error.message);
  return data as number;
}

export async function listAdmin(): Promise<AdminConfession[]> {
  if (!hasSupabase()) {
    return memory.confessions.map((c) => ({ ...c, meta: memory.meta.get(c.id) ?? null }));
  }

  const { data, error } = await createAdminClient()
    .from("confessions")
    .select("*, confession_meta(*)")
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const { confession_meta, ...confession } = row as Record<string, unknown> & {
      confession_meta: unknown;
    };
    return {
      ...confession,
      meta: Array.isArray(confession_meta) ? confession_meta[0] : confession_meta,
    } as AdminConfession;
  });
}

export async function setStatus(id: string, status: string) {
  if (!hasSupabase()) {
    const c = memory.confessions.find((x) => x.id === id);
    if (c) c.status = status;
    return;
  }
  const { error } = await createAdminClient()
    .from("confessions")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function remove(id: string) {
  if (!hasSupabase()) {
    memory.confessions.splice(
      memory.confessions.findIndex((c) => c.id === id),
      1,
    );
    memory.meta.delete(id);
    return;
  }
  const { error } = await createAdminClient().from("confessions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Announcements. One banner at a time, set from the admin panel.
// ---------------------------------------------------------------------------

export async function getAnnouncement(): Promise<Announcement | null> {
  if (!hasSupabase()) return memory.announcement;

  const { data, error } = await createAdminClient()
    .from("announcements")
    .select("id, message, level, link_url, link_label, created_at")
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as Announcement) ?? null;
}

export async function setAnnouncement(input: {
  message: string;
  level: AnnouncementLevel;
  linkUrl?: string;
  linkLabel?: string;
}): Promise<Announcement> {
  const row = {
    message: input.message,
    level: input.level,
    link_url: input.linkUrl || null,
    link_label: input.linkLabel || null,
  };

  if (!hasSupabase()) {
    memory.announcement = {
      id: randomUUID(),
      ...row,
      created_at: new Date().toISOString(),
    };
    return memory.announcement;
  }

  const supabase = createAdminClient();
  // Only one banner shows at a time, so retire the rest before adding this one.
  await supabase.from("announcements").update({ active: false }).eq("active", true);

  const { data, error } = await supabase
    .from("announcements")
    .insert({ ...row, active: true })
    .select("id, message, level, link_url, link_label, created_at")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not save that.");
  return data as Announcement;
}

export async function clearAnnouncement(): Promise<void> {
  if (!hasSupabase()) {
    memory.announcement = null;
    return;
  }
  const { error } = await createAdminClient()
    .from("announcements")
    .update({ active: false })
    .eq("active", true);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Replies. Anyone may read a thread; only the block network may add to it.
// ---------------------------------------------------------------------------

export async function listComments(confessionId: string): Promise<Comment[]> {
  if (!hasSupabase()) {
    return memory.comments
      .filter((c) => c.confession_id === confessionId && c.status === "approved")
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((c) => ({ id: c.id, body: c.body, created_at: c.created_at }));
  }

  const { data, error } = await createAdminClient()
    .from("comments")
    .select("id, body, created_at")
    .eq("confession_id", confessionId)
    .eq("status", "approved")
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) throw new Error(error.message);
  return (data ?? []) as Comment[];
}

export async function createComment(
  confessionId: string,
  body: string,
  meta: Record<string, unknown>,
): Promise<Comment | null> {
  if (!hasSupabase()) {
    const parent = memory.confessions.find(
      (c) => c.id === confessionId && c.status === "approved",
    );
    if (!parent) return null;

    const comment: AdminComment = {
      id: randomUUID(),
      confession_id: confessionId,
      body,
      status: "approved",
      reports: 0,
      created_at: new Date().toISOString(),
    };
    memory.comments.push(comment);
    parent.comments += 1;
    memory.meta.set(comment.id, meta);
    return { id: comment.id, body: comment.body, created_at: comment.created_at };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("comments")
    .insert({ confession_id: confessionId, body, status: "approved" })
    .select("id, body, created_at")
    .single();

  // A reply to a confession that has since gone is a 404, not a 500.
  if (error?.code === "23503") return null;
  if (error || !data) throw new Error(error?.message ?? "Could not save that reply.");

  await supabase.from("comment_meta").insert({ comment_id: data.id, ...meta });
  return data as Comment;
}

export async function listAdminComments(): Promise<AdminComment[]> {
  if (!hasSupabase()) {
    return [...memory.comments]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((c) => ({ ...c, meta: memory.meta.get(c.id) ?? null }));
  }

  const { data, error } = await createAdminClient()
    .from("comments")
    .select("*, comment_meta(*)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const { comment_meta, ...comment } = row as Record<string, unknown> & {
      comment_meta: unknown;
    };
    return {
      ...comment,
      meta: Array.isArray(comment_meta) ? comment_meta[0] : comment_meta,
    } as AdminComment;
  });
}

export async function removeComment(id: string): Promise<void> {
  if (!hasSupabase()) {
    const i = memory.comments.findIndex((c) => c.id === id);
    if (i === -1) return;
    const parent = memory.confessions.find(
      (c) => c.id === memory.comments[i].confession_id,
    );
    if (parent) parent.comments = Math.max(0, parent.comments - 1);
    memory.comments.splice(i, 1);
    memory.meta.delete(id);
    return;
  }
  const { error } = await createAdminClient().from("comments").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
