"use client";

import type { BlockId } from "./blocks";

const KEY = "cbc_identity";

export type Identity = { block: BlockId; course?: string };

/**
 * The student's own block and course, remembered so they are asked once rather
 * than on every confession. Never sent anywhere except with a confession, and
 * even then it lands in the admin-only meta table.
 */
export function readIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Identity) : null;
  } catch {
    return null;
  }
}

export function writeIdentity(identity: Identity) {
  try {
    localStorage.setItem(KEY, JSON.stringify(identity));
  } catch {
    // Private mode. They will be asked again next time.
  }
}

export function clearIdentity() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to do.
  }
}
