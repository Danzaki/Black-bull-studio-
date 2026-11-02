"use client";
import { useQuery } from "@tanstack/react-query";
import { useChain } from "@/lib/chains/ChainContext";

export function useChainTrending() {
  const { chainId } = useChain();
  return useQuery({
    queryKey: ["chain-trending", chainId],
    queryFn: async () => {
      const r = await fetch(`/api/chain/trending?chain=${chainId}`);
      if (!r.ok) throw new Error("Failed to load trending");
      return (await r.json()).tokens as any[];
    },
    refetchInterval: 30_000,
  });
}
