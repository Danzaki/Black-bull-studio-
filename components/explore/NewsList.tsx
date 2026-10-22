"use client";

import { useEffect, useState } from "react";
import { authedFetch } from "@/lib/authedFetch";

interface NewsItem {
  title: string;
  link: string;
  source: string;
  category: string;
  publishedAt: number;
}

function timeAgo(ts: number) {
  const m = Math.max(0, Math.floor((Date.now() - ts) / 60000));
  if (m < 60) return `${m || 1}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NewsList({ category, limit = 30 }: { category?: "crypto" | "sports"; limit?: number }) {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await authedFetch(`/api/news${category ? `?cat=${category}` : ""}`, { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        if (!alive) return;
        if (!res.ok) setError(true);
        else setItems((json.items ?? []) as NewsItem[]);
      } catch {
        if (alive) setError(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [category]);

  if (error && !items) return <p className="py-8 text-center text-sm text-white/50">Could not load news.</p>;
  if (!items) {
    return (
      <div className="space-y-4 py-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-white/[0.06]" />
        ))}
      </div>
    );
  }
  if (!items.length) return <p className="py-8 text-center text-sm text-white/50">No news right now.</p>;

  return (
    <div>
      {items.slice(0, limit).map((n) => (
        <a
          key={n.link}
          href={n.link}
          target="_blank"
          rel="noopener noreferrer"
          className="block border-b border-white/10 py-3.5"
        >
          <p className="text-[15px] font-bold leading-snug text-white">{n.title}</p>
          <p className="mt-1.5 text-xs text-white/50">
            {timeAgo(n.publishedAt)} · {n.source}
          </p>
        </a>
      ))}
    </div>
  );
}
