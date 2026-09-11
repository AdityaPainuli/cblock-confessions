"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) return router.refresh();
    setError((await res.json()).error ?? "Login failed.");
  }

  return (
    <main className="grid min-h-[100dvh] place-items-center bg-[#070b12] px-6 text-white">
      <form onSubmit={submit} className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold">C Block admin</h1>
        <p className="mt-1 text-sm text-white/40">Moderation and submission logs.</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          autoFocus
          className="mt-6 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 focus:border-[#ff2f87]/60 focus:outline-none"
        />
        {error && <p className="mt-3 text-sm text-[#ff8080]">{error}</p>}
        <button
          disabled={busy}
          className="mt-4 w-full rounded-xl bg-[#ff2f87] py-3 font-medium disabled:opacity-50"
        >
          {busy ? "Checking..." : "Enter"}
        </button>
      </form>
    </main>
  );
}
