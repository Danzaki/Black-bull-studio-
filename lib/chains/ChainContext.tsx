"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ChainConfig, ChainId, DEFAULT_CHAIN, getChain, isChainId } from "./index";

type Ctx = { chainId: ChainId; chain: ChainConfig; setChain: (id: ChainId) => void };

const ChainCtx = createContext<Ctx | null>(null);
const KEY = "bb_selected_chain";

export function ChainProvider({ children }: { children: React.ReactNode }) {
  const [chainId, setChainId] = useState<ChainId>(DEFAULT_CHAIN);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && isChainId(saved)) setChainId(saved);
    } catch {}
  }, []);

  const setChain = useCallback((id: ChainId) => {
    setChainId(id);
    try { localStorage.setItem(KEY, id); } catch {}
  }, []);

  return (
    <ChainCtx.Provider value={{ chainId, chain: getChain(chainId), setChain }}>
      {children}
    </ChainCtx.Provider>
  );
}

export function useChain() {
  const ctx = useContext(ChainCtx);
  return ctx ?? { chainId: DEFAULT_CHAIN, chain: getChain(DEFAULT_CHAIN), setChain: () => {} };
}
