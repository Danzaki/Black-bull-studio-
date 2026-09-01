"use client";

import { useEffect, useState } from "react";

export interface TokenHolding {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  decimals: number;
  valueUsd: number;
  imageUrl?: string;
  logoURI?: string;
}

export function useWalletHoldings(walletAddress: string | null) {
  const [holdings, setHoldings] = useState<TokenHolding[]>([]);
  const [totalValueUsd, setTotalValueUsd] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!walletAddress) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchHoldings() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/wallet-holdings?address=${walletAddress}`);
        
        if (!res.ok) {
          throw new Error("Failed to fetch wallet holdings from API");
        }

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        if (isMounted) {
          const items: TokenHolding[] = data.holdings || [];
          setHoldings(items);

          const total = items.reduce((acc, item) => acc + (item.valueUsd || 0), 0);
          setTotalValueUsd(total);

          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Error loading holdings");
          setLoading(false);
        }
      }
    }

    fetchHoldings();

    return () => {
      isMounted = false;
    };
  }, [walletAddress]);

  return { holdings, totalValueUsd, loading, error };
}
