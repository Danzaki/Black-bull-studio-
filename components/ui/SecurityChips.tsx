import type { TokenSnapshot } from "@/types/ui";

type Security = TokenSnapshot["security"];
type Tone = "good" | "warn" | "bad" | "none";

function tone(v: number | null, warn: number, bad: number): Tone {
  if (v === null) return "none";
  if (v >= bad) return "bad";
  if (v >= warn) return "warn";
  return "good";
}

const TONE_CLASS: Record<Tone, string> = {
  good: "text-bb-up border-bb-up/25 bg-bb-up/10",
  warn: "text-amber-400 border-amber-400/25 bg-amber-400/10",
  bad: "text-bb-down border-bb-down/25 bg-bb-down/10",
  none: "text-zinc-500 border-bb-border bg-bb-raised",
};

function Chip({ label, value, t }: { label: string; value: number | null; t: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${TONE_CLASS[t]}`}
    >
      <span className="opacity-70">{label}</span>
      {value === null ? "--" : `${value.toFixed(value < 10 ? 1 : 0)}%`}
    </span>
  );
}

export default function SecurityChips({ s }: { s: Security }) {
  return (
    <div className="flex flex-wrap gap-1">
      <Chip label="Dev" value={s.devHoldPct} t={tone(s.devHoldPct, 5, 10)} />
      <Chip label="Snipers" value={s.snipers} t={tone(s.snipers, 10, 20)} />
      <Chip label="Insiders" value={s.insiders} t={tone(s.insiders, 10, 20)} />
      <Chip label="Bundle" value={s.bundlers} t={tone(s.bundlers, 5, 15)} />
      <Chip label="Top10" value={s.top10Pct} t={tone(s.top10Pct, 30, 50)} />
      <Chip label="Tax" value={s.taxPct} t={tone(s.taxPct, 0.1, 5)} />
    </div>
  );
}
