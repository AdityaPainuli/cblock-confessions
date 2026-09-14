export default function StatCard({
  label,
  value,
  hint,
  tone = "plain",
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "plain" | "warn" | "alert";
}) {
  const tones = {
    plain: "border-line bg-surface",
    warn: "border-gold/45 bg-gold/10",
    alert: "border-maroon/35 bg-maroon/8",
  } as const;

  const values = {
    plain: "text-foreground",
    warn: "text-[#7a6212]",
    alert: "text-maroon",
  } as const;

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${values[tone]}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-muted">{hint}</p>}
    </div>
  );
}
