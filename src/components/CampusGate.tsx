import Link from "next/link";

/**
 * Shown to anyone reaching the wall from outside the university network. The
 * address is echoed back so a student can send it over when the allowlist
 * needs another range.
 */
export default function CampusGate({ ip }: { ip?: string }) {
  return (
    <main className="grid min-h-[100dvh] place-items-center bg-background px-5 py-10 text-foreground">
      <div className="w-full max-w-md text-center">
        <p className="text-[11px] uppercase tracking-[0.34em] text-muted">
          Galgotias University
        </p>
        <h1 className="mt-3 text-[clamp(1.8rem,8vw,2.6rem)] font-bold leading-tight">
          Campus wifi only
        </h1>

        <p className="mt-4 text-pretty text-sm leading-relaxed text-muted">
          This wall is open to students on the university network. Connect to campus
          wifi and open it again.
        </p>

        <div className="mt-7 rounded-2xl border border-line bg-surface p-5 text-left">
          <h2 className="text-sm font-semibold">If you are on campus wifi</h2>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted">
            <li>Mobile data will not work, even standing on campus.</li>
            <li>Turn off any VPN, then reload.</li>
            <li>
              Still stuck? Send this address to whoever runs the site:
              <code className="mt-1.5 block rounded-lg bg-[#fdf7ec] px-3 py-2 font-mono text-xs text-foreground">
                {ip ?? "unknown"}
              </code>
            </li>
          </ul>
        </div>

        <p className="mt-6 text-xs text-muted">
          <Link href="/privacy" className="underline underline-offset-2">
            What this site records
          </Link>
        </p>
      </div>
    </main>
  );
}
