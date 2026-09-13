"use client";

import { collectSignals } from "./signals";

const KEY = "cbc_votes";

type Votes = Record<string, { heart?: true; report?: true }>;

/**
 * Remembers what this browser already voted on, so a reader who comes back
 * does not see their own heart uncounted. The server dedupes as well; this is
 * only so the UI tells the truth before the round trip.
 */
function read(): Votes {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Votes;
  } catch {
    return {};
  }
}

function write(v: Votes) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    // Private mode or blocked storage. The server still dedupes.
  }
}

export function hasVoted(id: string, kind: "heart" | "report") {
  return Boolean(read()[id]?.[kind]);
}

export function remember(id: string, kind: "heart" | "report") {
  const v = read();
  v[id] = { ...v[id], [kind]: true };
  write(v);
}

/** Stable per-browser key. Derived from the same signals the server parses. */
export function deviceKey(): string {
  return collectSignals().fingerprint ?? "unknown";
}

export async function vote(id: string, kind: "heart" | "report") {
  if (hasVoted(id, kind)) return false;
  remember(id, kind);
  try {
    await fetch(`/api/confessions/${id}/vote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, device: deviceKey() }),
      keepalive: true,
    });
  } catch {
    // Swallowed: a lost heart is not worth interrupting the reader.
  }
  return true;
}
