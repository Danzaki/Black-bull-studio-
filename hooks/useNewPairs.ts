"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";

export interface NewPair {
  mint: string;
  name: string | null;
  symbol: string | null;
  creator: string | null;
  source: string;
  created_at: string;
}

const MAX_ITEMS = 30;
const COLUMNS = "mint, name, symbol, creator, source, created_at";

export function useNewPairs() {
  const [pairs, setPairs] = useState<NewPair[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    let active = true;

    async function load() {
      const { data } = await supabase
        .from("new_pairs")
        .select(COLUMNS)
        .order("created_at", { ascending: false })
        .limit(MAX_ITEMS);
      if (!active) return;
      setPairs((data ?? []) as NewPair[]);
      setLoading(false);
    }
    void load();

    const channel = supabase
      .channel("new-pairs-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "new_pairs" },
        (payload: { new: unknown }) => {
          const row = payload.new as NewPair;
          setPairs((prev) => {
            if (prev.some((p) => p.mint === row.mint)) return prev;
            return [row, ...prev].slice(0, MAX_ITEMS);
          });
        }
      )
      .subscribe();

    // Idan realtime ya kasa, a sake ɗauko duk bayan sakan 30
    const poll = setInterval(() => void load(), 30000);

    return () => {
      active = false;
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, []);

  return { pairs, loading };
}
