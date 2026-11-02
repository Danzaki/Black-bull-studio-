"use client";
import { useQuery } from "@tanstack/react-query";
import { useChain } from "@/lib/chains/ChainContext";

export function useChainToken(address?: string) {
  const { chainId } = useChain();
  return useQuery({
    queryKey: ["chain-token", chainId, address],
    enabled: !!address,
    queryFn: async () => {
      const r = await fetch(`/api/chain/token?chain=${chainId}&address=${address}`);
      if (!r.ok) throw new Error("Token not found");
      return r.json();
    },
    refetchInterval: 15_000,
  });
}

export function useChainSecurity(address?: string) {
  const { chainId, chain } = useChain();
  return useQuery({
    queryKey: ["chain-security", chainId, address],
    enabled: !!address && chain.type === "evm",
    queryFn: async () => {
      const r = await fetch(`/api/chain/security?chain=${chainId}&address=${address}`);
      if (!r.ok) throw new Error("No security data");
      return r.json();
    },
  });
}
