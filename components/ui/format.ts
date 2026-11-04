export function fmtUsd(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "--";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export function fmtPct(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "--";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function fmtAge(seconds: number | null): string {
  if (seconds === null) return "--";
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}
