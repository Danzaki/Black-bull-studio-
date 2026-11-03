"use client";

import type { ReactNode } from "react";
import { useChain } from "@/lib/chains/ChainContext";

export default function ChainGate({ solana, evm }: { solana: ReactNode; evm: ReactNode }) {
  const { chain } = useChain();
  return <>{chain.type === "solana" ? solana : evm}</>;
}
