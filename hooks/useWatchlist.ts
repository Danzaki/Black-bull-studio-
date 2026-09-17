"use client";

import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "bb_watchlist";

export interface WatchlistToken {
  mint: string;
  symbol: string;
  name: string;
  imageUrl: string | null;
  poolAddress?: string;
  decimals: number;
}

function loadWatchlist(): WatchlistToken[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistWatchlist(list: WatchlistToken[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore storage errors
  }
}

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistToken[]>([]);

  useEffect(() => {
    setWatchlist(loadWatchlist());
  }, []);

  const isFavorited = useCallback(
    (mint: string) => watchlist.some((t) => t.mint === mint),
    [watchlist]
  );

  const toggleFavorite = useCallback((token: WatchlistToken) => {
    setWatchlist((prev) => {
      const exists = prev.some((t) => t.mint === token.mint);
      const next = exists ? prev.filter((t) => t.mint !== token.mint) : [token, ...prev];
      persistWatchlist(next);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((mint: string) => {
    setWatchlist((prev) => {
      const next = prev.filter((t) => t.mint !== mint);
      persistWatchlist(next);
      return next;
    });
  }, []);

  return { watchlist, isFavorited, toggleFavorite, removeFavorite };
}
