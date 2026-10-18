"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

interface PollOption {
  id: string;
  text: string;
  votes: number;
}
interface PollData {
  post_id: string;
  poll_id: string;
  ends_at: string;
  my_option: string | null;
  total: number;
  options: PollOption[];
}

const pending = new Map<string, Array<(p: PollData | null) => void>>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  timer = null;
  const batch = new Map(pending);
  pending.clear();
  const ids = Array.from(batch.keys());
  let rows: PollData[] = [];
  try {
    const { data } = await getSupabaseClient().rpc("get_polls", { p_post_ids: ids });
    rows = (data ?? []) as PollData[];
  } catch {}
  const byPost = new Map<string, PollData>();
  rows.forEach((r) => byPost.set(r.post_id, { ...r, total: Number(r.total) }));
  batch.forEach((resolvers, id) => {
    const row = byPost.get(id) ?? null;
    resolvers.forEach((resolve) => resolve(row));
  });
}

function fetchPoll(postId: string): Promise<PollData | null> {
  return new Promise((resolve) => {
    const list = pending.get(postId) ?? [];
    list.push(resolve);
    pending.set(postId, list);
    if (!timer) timer = setTimeout(() => void flush(), 40);
  });
}

function formatLeft(ms: number) {
  if (ms <= 0) return "Final results";
  const m = Math.ceil(ms / 60000);
  if (m < 60) return `${m}m left`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h left`;
  return `${Math.floor(h / 24)}d left`;
}

function PollBody({
  poll,
  busy,
  error,
  onVote,
}: {
  poll: PollData;
  busy: boolean;
  error: string;
  onVote: (optionId: string) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const left = new Date(poll.ends_at).getTime() - now;
  const showResults = left <= 0 || !!poll.my_option;

  return (
    <div className="mt-3 space-y-2" onClick={(e) => e.stopPropagation()}>
      {poll.options.map((o) => {
        const pct = poll.total ? Math.round((o.votes / poll.total) * 100) : 0;
        const mine = poll.my_option === o.id;
        return showResults ? (
          <div key={o.id} className="relative overflow-hidden rounded-xl border border-stone-900/10 px-3 py-2.5 text-sm">
            <div
              className={`absolute inset-y-0 left-0 ${mine ? "bg-[#f97316]/25" : "bg-stone-900/[0.06]"}`}
              style={{ width: `${pct}%` }}
            />
            <div className="relative flex items-center justify-between gap-2">
              <span className={mine ? "font-semibold text-stone-900" : "text-stone-700"}>
                {o.text}
                {mine ? " ✓" : ""}
              </span>
              <span className="text-xs text-stone-500">{pct}%</span>
            </div>
          </div>
        ) : (
          <button
            key={o.id}
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onVote(o.id);
            }}
            className="w-full rounded-xl border border-[#f97316]/50 px-3 py-2.5 text-left text-sm font-semibold text-[#f97316] disabled:opacity-50"
          >
            {o.text}
          </button>
        );
      })}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-xs text-stone-500">
        {poll.total} {poll.total === 1 ? "vote" : "votes"} · {formatLeft(left)}
      </p>
    </div>
  );
}

export default function PostPoll({ postId }: { postId: string }) {
  const [poll, setPoll] = useState<PollData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    void fetchPoll(postId).then((p) => {
      if (alive) setPoll(p);
    });
    return () => {
      alive = false;
    };
  }, [postId]);

  async function vote(optionId: string) {
    if (!poll || busy) return;
    setBusy(true);
    setError("");
    const supabase = getSupabaseClient();
    const { error: e } = await supabase.rpc("vote_poll", {
      p_poll_id: poll.poll_id,
      p_option_id: optionId,
    });
    if (e) {
      const m = String(e.message || "");
      setError(
        /ended/i.test(m)
          ? "This poll has ended."
          : /already|duplicate/i.test(m)
          ? "You already voted."
          : "Could not record your vote."
      );
    }
    const { data } = await supabase.rpc("get_polls", { p_post_ids: [poll.post_id] });
    const row = ((data ?? []) as PollData[])[0];
    if (row) setPoll({ ...row, total: Number(row.total) });
    setBusy(false);
  }

  if (!poll) return null;
  return <PollBody poll={poll} busy={busy} error={error} onVote={(id) => void vote(id)} />;
}
