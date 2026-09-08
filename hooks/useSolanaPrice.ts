"use client";

import { useEffect, useState } from "react";

const SOLANA_MINTS: Record<string, string> = {
  SOL: "So11111111111111111111111111111111111111112",
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  BONK: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  JUP: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  RAY: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
  WIF: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
};

/**
 * Fetches live price for a Solana token via Jupiter's Price API v3.
 * Pass either a known symbol (e.g. "SOL") or a raw mint address directly.
 */
export function useSolanaPrice(symbolOrMint: string = "SOL") {
  const [price, setPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const upper = symbolOrMint.toUpperCase();
    const mintAddress = SOLANA_MINTS[upper] || symbolOrMint;

    async function fetchPrice() {
      try {
        const response = await fetch(
          `https://lite-api.jup.ag/price/v3?ids=${mintAddress}`
        );
        const json = await response.json();

        if (isMounted && json[mintAddress]?.usdPrice) {
          setPrice(json[mintAddress].usdPrice);
          setError(null);
        } else if (isMounted) {
          setPrice(null);
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to fetch price");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchPrice();
    const interval = setInterval(fetchPrice, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [symbolOrMint]);

  return { price, loading, error };
}
