"use client";

export interface PollDraft {
  options: string[];
  minutes: number;
}

export const EMPTY_POLL: PollDraft = { options: ["", ""], minutes: 1440 };

export const cleanPollOptions = (p: PollDraft) => p.options.map((o) => o.trim()).filter(Boolean);

const DURATIONS = [
  { label: "1 hour", minutes: 60 },
  { label: "1 day", minutes: 1440 },
  { label: "3 days", minutes: 4320 },
  { label: "7 days", minutes: 10080 },
];

export default function PollComposer({
  value,
  onChange,
  onRemove,
}: {
  value: PollDraft;
  onChange: (v: PollDraft) => void;
  onRemove: () => void;
}) {
  const setOpt = (i: number, text: string) =>
    onChange({ ...value, options: value.options.map((o, idx) => (idx === i ? text : o)) });

  return (
    <div className="space-y-2 rounded-2xl border border-bbl-border p-3">
      {value.options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={o}
            maxLength={60}
            placeholder={`Option ${i + 1}`}
            onChange={(e) => setOpt(i, e.target.value)}
            className="w-full rounded-xl border border-bbl-border bg-bbl-text/[0.05] px-3 py-2 text-sm text-bbl-text outline-none focus:border-bbl-accent/60"
          />
          {value.options.length > 2 && (
            <button
              type="button"
              aria-label="Remove option"
              onClick={() => onChange({ ...value, options: value.options.filter((_, idx) => idx !== i) })}
              className="px-2 text-bbl-muted"
            >
              ×
            </button>
          )}
        </div>
      ))}
      {value.options.length < 4 && (
        <button
          type="button"
          onClick={() => onChange({ ...value, options: [...value.options, ""] })}
          className="text-xs font-semibold text-bbl-accent"
        >
          + Add option
        </button>
      )}
      <div className="flex items-center justify-between gap-2 pt-1">
        <select
          value={value.minutes}
          onChange={(e) => onChange({ ...value, minutes: Number(e.target.value) })}
          className="rounded-lg border border-bbl-border bg-white px-2 py-1.5 text-xs text-bbl-text/80"
        >
          {DURATIONS.map((d) => (
            <option key={d.minutes} value={d.minutes}>
              {d.label}
            </option>
          ))}
        </select>
        <button type="button" onClick={onRemove} className="text-xs text-bbl-muted">
          Remove poll
        </button>
      </div>
    </div>
  );
}
