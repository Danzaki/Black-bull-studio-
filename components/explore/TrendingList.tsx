"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

interface Trend {
  tag: string;
  posts: number;
  authors: number;
  avatars: (string | null)[];
}

export default function TrendingList({
  limit = 10,
  hours = 168,
  hideWhenEmpty = false,
}: {
  limit?: number;
  hours?: number;
  hideWhenEmpty?: boolean;
}) {
  const [trends, setTrends] = useState<Trend[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await getSupabaseClient().rpc("get_trending", { p_hours: hours, p_limit: 25 });
      if (!alive) return;
      const rows = ((data ?? []) as Trend[]).map((r) => ({
        ...r,
        posts: Number(r.posts),
        authors: Number(r.authors),
        avatars: Array.isArray(r.avatars) ? r.avatars : [],
      }));
      rows.sort((a, b) => b.authors - a.authors || b.posts - a.posts);
      setTrends(rows.slice(0, limit));
    })();
    return () => {
      alive = false;
    };
  }, [hours, limit]);

  if (!trends) {
    if (hideWhenEmpty) return null;
    return (
      <div className="space-y-3 py-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.06]" />
        ))}
      </div>
    );
  }
  if (hideWhenEmpty && !trends.length) return null;
  if (!trends.length) {
    return (
      <p className="py-8 text-center text-sm text-white/50">
        Nothing trending yet. Post with a #hashtag or $cashtag to start one.
      </p>
    );
  }

  return (
    <div>
      {trends.map((t, i) => (
        <Link
          key={t.tag}
          href={`/search?q=${encodeURIComponent(t.tag)}&tab=posts`}
          className="flex items-center justify-between gap-3 border-b border-white/10 py-3.5"
        >
          <div className="min-w-0">
            <p className="text-xs text-white/50">{i + 1} · Trending</p>
            <p className="truncate text-[15px] font-bold text-white">{t.tag}</p>
            <p className="text-xs text-white/50">
              {t.posts} {t.posts === 1 ? "post" : "posts"}
            </p>
          </div>
          <div className="flex shrink-0 -space-x-2">
            {t.avatars.slice(0, 3).map((a, idx) =>
              a ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={idx} src={a} alt="" className="h-7 w-7 rounded-full border-2 border-black object-cover" />
              ) : (
                <span key={idx} className="h-7 w-7 rounded-full border-2 border-black bg-white/20" />
              )
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
