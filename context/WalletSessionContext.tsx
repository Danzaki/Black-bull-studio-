"use client";

import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import type { Connection, Keypair } from "@solana/web3.js";
import { getSupabaseClient } from "@/lib/supabaseClient";

const loadWeb3 = () => import("@solana/web3.js");

interface SendResult {
  success: boolean;
  error?: string;
  signature?: string;
}

interface WalletSessionValue {
  publicKey: string | null;
  hasWallet: boolean | null;
  isUnlocked: boolean;
  balanceSol: number | null;
  balanceFailed: boolean;
  loading: boolean;
  checkWallet: () => Promise<void>;
  createWallet: (password?: string) => Promise<{ success: boolean; error?: string }>;
  refreshBalance: () => Promise<void>;
  sendSol: (recipientAddress: string, amountSol: number) => Promise<SendResult>;
  walletError: string | null;
}

const WalletSessionContext = createContext<WalletSessionValue | null>(null);

export function WalletSessionProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseClient();
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [balanceSol, setBalanceSol] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [balanceFailed, setBalanceFailed] = useState(false);

  const heliusKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  const rpcEndpoint = heliusKey
    ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`
    : "https://api.mainnet-beta.solana.com";
  const connectionRef = useRef<Connection | null>(null);
  const getConnection = useCallback(async () => {
    if (!connectionRef.current) {
      const { Connection } = await loadWeb3();
      connectionRef.current = new Connection(rpcEndpoint, "confirmed");
    }
    return connectionRef.current;
  }, [rpcEndpoint]);

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    };
  }, [supabase]);

  const checking = useRef(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const checkWallet = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    setLoading(true);
    setWalletError(null);
    let pk: string | null = null;
    let lastErr: string | null = null;
    try {
      const headers = await authHeaders();
      for (let i = 0; i < 3 && !pk; i++) {
        const res = await fetch("/api/wallet/create", { headers, cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (res.ok && json?.wallet?.publicKey) { pk = json.wallet.publicKey; break; }
        if (res.status === 401) { lastErr = null; break; }
        if (res.ok) {
          const c = await fetch("/api/wallet/create", { method: "POST", headers });
          const cj = await c.json().catch(() => null);
          if (c.ok && cj?.wallet?.publicKey) { pk = cj.wallet.publicKey; break; }
          lastErr = cj?.error || "Wallet setup failed";
        } else {
          lastErr = json?.error || "Wallet setup failed";
        }
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
      }
    } catch (e: any) {
      lastErr = e?.message || "Network error";
    }
    setHasWallet(!!pk);
    setPublicKey(pk);
    setWalletError(pk ? null : lastErr);
    setLoading(false);
    checking.current = false;
  }, [authHeaders]);

  useEffect(() => {
    void checkWallet();
    const { data: sub } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === "SIGNED_IN") void checkWallet();
      if (event === "SIGNED_OUT") { setHasWallet(false); setPublicKey(null); setBalanceSol(null); }
    });
    return () => sub.subscription.unsubscribe();
  }, [checkWallet, supabase]);

  const createWallet = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/wallet/create", { method: "POST", headers: await authHeaders() });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.wallet?.publicKey) {
        setLoading(false);
        return { success: false, error: json?.error || "Could not create wallet." };
      }
      setPublicKey(json.wallet.publicKey);
      setHasWallet(true);
      setLoading(false);
      return { success: true };
    } catch {
      setLoading(false);
      return { success: false, error: "Network error." };
    }
  }, [authHeaders]);

  // Ba a buƙatar password kuma: wallet yana buɗewa ta login.

  const refreshBalance = useCallback(async () => {
    if (!publicKey) return;
    try {
      const { PublicKey } = await loadWeb3();
      const connection = await getConnection();
      const lamports = await connection.getBalance(new PublicKey(publicKey));
      setBalanceSol(lamports / 1_000_000_000);
      setBalanceFailed(false);
    } catch (err) {
      console.error("Error fetching balance:", err);
      try {
        const res = await fetch("/api/wallet/balance?address=" + publicKey, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (res.ok && typeof json?.sol === "number") {
          setBalanceSol(json.sol);
          setBalanceFailed(false);
          return;
        }
      } catch {}
      setBalanceFailed(true);
    }
  }, [publicKey, getConnection]);

  const sendSol = useCallback(
    async (recipientAddress: string, amountSol: number): Promise<SendResult> => {
      try {
        const res = await fetch("/api/wallet/send", {
          method: "POST",
          headers: await authHeaders(),
          body: JSON.stringify({ to: recipientAddress, amountSol }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) return { success: false, error: json?.error || "Transaction failed" };
        await refreshBalance();
        return { success: true, signature: json.signature };
      } catch (err: any) {
        return { success: false, error: err?.message || "Transaction failed" };
      }
    },
    [authHeaders, refreshBalance]
  );

  useEffect(() => {
    if (!publicKey) return;
    void refreshBalance();
    const interval = setInterval(() => void refreshBalance(), 12000);
    return () => clearInterval(interval);
  }, [publicKey, refreshBalance]);

  const value = useMemo(
    () => ({
      publicKey,
      hasWallet,
      isUnlocked: hasWallet === true,
      balanceSol,
      balanceFailed,
      loading,
      checkWallet,
      createWallet,
      refreshBalance,
      sendSol,
      walletError,
    }),
    [publicKey, hasWallet, balanceSol, balanceFailed, loading, checkWallet, createWallet, refreshBalance, sendSol, walletError]
  );

  return <WalletSessionContext.Provider value={value}>{children}</WalletSessionContext.Provider>;
}

export function useWalletSession() {
  const ctx = useContext(WalletSessionContext);
  if (!ctx) throw new Error("useWalletSession must be used within WalletSessionProvider");
  return ctx;
}
