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
  loading: boolean;
  checkWallet: () => Promise<void>;
  createWallet: (password?: string) => Promise<{ success: boolean; error?: string }>;
  unlockWallet: (password?: string) => Promise<{ success: boolean; error?: string }>;
  changeWalletPassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  lockWallet: () => void;
  refreshBalance: () => Promise<void>;
  getKeypair: () => Keypair | null;
  sendSol: (recipientAddress: string, amountSol: number) => Promise<SendResult>;
}

const WalletSessionContext = createContext<WalletSessionValue | null>(null);

export function WalletSessionProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseClient();
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [hasWallet, setHasWallet] = useState<boolean | null>(null);
  const [balanceSol, setBalanceSol] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

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
  const checkWallet = useCallback(async () => {
    if (checking.current) return;
    checking.current = true;
    setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/wallet/create", { headers, cache: "no-store" });
      const json = await res.json().catch(() => null);
      let pk: string | null = res.ok ? json?.wallet?.publicKey ?? null : null;
      if (res.ok && !pk) {
        const created = await fetch("/api/wallet/create", { method: "POST", headers });
        const cj = await created.json().catch(() => null);
        pk = created.ok ? cj?.wallet?.publicKey ?? null : null;
      }
      setHasWallet(!!pk);
      setPublicKey(pk);
    } catch {
      setHasWallet(false);
    }
    setLoading(false);
    checking.current = false;
  }, [authHeaders]);

  useEffect(() => {
    void checkWallet();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
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
  const unlockWallet = useCallback(async () => ({ success: true }), []);
  const changeWalletPassword = useCallback(
    async () => ({ success: false, error: "Wallet no longer uses a password." }),
    []
  );
  const lockWallet = useCallback(() => {}, []);
  const getKeypair = useCallback((): Keypair | null => null, []);

  const refreshBalance = useCallback(async () => {
    if (!publicKey) return;
    try {
      const { PublicKey } = await loadWeb3();
      const connection = await getConnection();
      const lamports = await connection.getBalance(new PublicKey(publicKey));
      setBalanceSol(lamports / 1_000_000_000);
    } catch (err) {
      console.error("Error fetching balance:", err);
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
      loading,
      checkWallet,
      createWallet,
      unlockWallet,
      changeWalletPassword,
      lockWallet,
      refreshBalance,
      getKeypair,
      sendSol,
    }),
    [publicKey, hasWallet, balanceSol, loading, checkWallet, createWallet, unlockWallet, changeWalletPassword, lockWallet, refreshBalance, getKeypair, sendSol]
  );

  return <WalletSessionContext.Provider value={value}>{children}</WalletSessionContext.Provider>;
}

export function useWalletSession() {
  const ctx = useContext(WalletSessionContext);
  if (!ctx) throw new Error("useWalletSession must be used within WalletSessionProvider");
  return ctx;
}
