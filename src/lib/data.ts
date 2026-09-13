import "server-only";
import { randomUUID } from "crypto";
import { createAdminClient } from "./supabase/admin";
import type { Confession, Mood, Origin } from "./types";

export type MetaRow = Record<string, unknown> & { confession_id: string };
export type AdminConfession = Confession & {
  status: string;
  meta?: Record<string, unknown> | null;
};

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
    mood: "rage",
    to_block: "C",
    status: "approved",
    hearts: 203,
    created_at: new Date(Date.now() - 26e6).toISOString(),
  },
];

type MemoryStore = {
  confessions: AdminConfession[];
  meta: Map<string, Record<string, unknown>>;
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
  meta: new Map(),
});

export async function listPublic(
  tag?: string | null,
  toBlock: string = "C",
): Promise<Confession[]> {
  if (!hasSupabase()) {
    return memory.confessions
      .filter(
        (c) =>
          c.status === "approved" &&
          c.to_block === toBlock &&
          (!tag || tag === "all" || c.tag === tag),
      )
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((c) => ({
        id: c.id,
        body: c.body,
        tag: c.tag,
        mood: c.mood,
        to_block: c.to_block,
        hearts: c.hearts,
        created_at: c.created_at,
      }));
  }

  let query = createAdminClient()
    .from("confessions")
    .select("id, body, tag, mood, to_block, hearts, created_at")
    .eq("status", "approved")
    .eq("to_block", toBlock)
    .order("created_at", { ascending: false })
    .limit(60);

  if (tag && tag !== "all") query = query.eq("tag", tag);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as Confession[];
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

export async function heart(id: string): Promise<number | null> {
  if (!hasSupabase()) {
    const c = memory.confessions.find((x) => x.id === id);
    if (!c) return null;
    c.hearts += 1;
    return c.hearts;
  }

  const { data, error } = await createAdminClient().rpc("increment_hearts", { cid: id });
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
