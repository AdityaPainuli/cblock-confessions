/**
 * Shown only on a deployed site that has no database. Each serverless instance
 * keeps its own copy of the demo store, so confessions appear and vanish
 * depending on which instance answers. Better to say so than to let it look
 * haunted.
 */
export default function DemoModeNotice() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-50 px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <p className="mx-auto max-w-lg rounded-xl border border-gold/50 bg-[#fdf3d8]/95 px-3 py-2 text-center text-[11px] leading-relaxed text-[#5c4a12] shadow-sm">
        Not connected to a database yet, so nothing posted here is saved. Set the
        Supabase environment variables and redeploy.
      </p>
    </div>
  );
}
