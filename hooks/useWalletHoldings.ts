"use client";

import { useEffect, useState, useCallback } from "react";

export interface Holding {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  pricePerToken: number | null;
  valueUsd: number | null;
  imageUrl: string | null;
}

export function useWalletHoldings(walletAddress: string | null) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [totalValueUsd, setTotalValueUsd] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchHoldings = useCallback(async () => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }

    setError("");
    setLoading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
      if (!apiKey) {
        setError("Helius API key not configured.");
        setLoading(false);
        return;
      }

      const res = await fetch(`https://mainnet.helius-rpc.com/?api-key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "holdings",
          method: "getAssetsByOwner",
          params: {
            ownerAddress: walletAddress,
            page: 1,
            limit: 50,
            displayOptions: { showFungible: true },
          },
        }),
      });

      const json = await res.json();
      console.log("[useWalletHoldings] raw response:", json);

      if (!res.ok || json.error) {
        throw new Error(json.error?.message || "Failed to fetch wallet holdings");
      }

      const items = json.result?.items ?? [];
      console.log("[useWalletHoldings] items count:", items.length);

      let total = 0;

      const parsed: Holding[] = items
        .filter((item: any) => item.interface === "FungibleToken" || item.token_info)
        .map((item: any) => {
          const info = item.token_info || {};
          const decimals = info.decimals ?? 0;
          const balance = (info.balance ?? 0) / Math.pow(10, decimals);
          const pricePerToken = info.price_info?.price_per_token ?? null;
          const valueUsd = info.price_info?.total_price ?? null;
          if (valueUsd) total += valueUsd;

          return {
            mint: item.id,
            symbol: item.content?.metadata?.symbol || info.symbol || "?",
            name: item.content?.metadata?.name || info.symbol || "Unknown",
            balance,
            decimals,
            pricePerToken,
            valueUsd,
            imageUrl: item.content?.links?.image || null,
          };
        })
        .filter((h: Holding) => h.balance > 0)
        .filter((h: Holding) => h.name.length <= 40 && h.symbol.length <= 15)
        .sort((a: Holding, b: Holding) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));

      console.log("[useWalletHoldings] parsed holdings:", parsed);

      setHoldings(parsed);
      setTotalValueUsd(total);
    } catch (err: any) {
      console.error("[useWalletHoldings] error:", err);
      setError(err.message || "Failed to load holdings");
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  useEffect(() => {
    void fetchHoldings();
  }, [fetchHoldings]);

  return { holdings, totalValueUsd, loading, error, refresh: fetchHoldings };
}
