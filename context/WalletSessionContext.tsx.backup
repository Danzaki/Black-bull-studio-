"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, clusterApiUrl } from "@solana/web3.js";
import { getSupabaseClient } from "@/lib/supabaseClient";
import {
  generateNewWallet,
  encryptSecretKey,
  decryptSecretKey,
  getKeypairFromSecretKey,
} from "@/lib/walletCrypto";

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
  createWallet: (password: string) => Promise<{ success: boolean; error?: string }>;
  unlockWallet: (password: string) => Promise<{ success: boolean; error?: string }>;
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
  const [sessionKeypair, setSessionKeypair] = useState<Keypair | null>(null);

  const heliusKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
  const rpcEndpoint = heliusKey
    ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`
    : clusterApiUrl("mainnet-beta");
  const connection = new Connection(rpcEndpoint, "confirmed");

  const checkWallet = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setHasWallet(false);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("wallets")
      .select("public_key")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Error checking wallet:", error.message);
    }

    if (data) {
      setHasWallet(true);
      setPublicKey(data.public_key);
    } else {
      setHasWallet(false);
    }
    setLoading(false);
  }, [supabase]);

  const createWallet = useCallback(async (password: string) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return { success: false, error: "Not logged in" };
    }

    const wallet = generateNewWallet();
    const encrypted = await encryptSecretKey(wallet.secretKeyBs58, password);

    const { error } = await supabase.from("wallets").insert({
      user_id: user.id,
      public_key: wallet.publicKey,
      encrypted_secret_key: encrypted.encryptedSecretKey,
      salt: encrypted.salt,
      iv: encrypted.iv,
    });

    if (error) {
      setLoading(false);
      return { success: false, error: error.message };
    }

    setPublicKey(wallet.publicKey);
    setHasWallet(true);
    setSessionKeypair(getKeypairFromSecretKey(wallet.secretKeyBs58));
    setLoading(false);
    return { success: true };
  }, [supabase]);

  const unlockWallet = useCallback(async (password: string) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return { success: false, error: "Not logged in" };
    }

    const { data, error } = await supabase
      .from("wallets")
      .select("public_key, encrypted_secret_key, salt, iv")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !data) {
      setLoading(false);
      return { success: false, error: "Wallet not found" };
    }

    const secretKeyBs58 = await decryptSecretKey(
      {
        encryptedSecretKey: data.encrypted_secret_key,
        salt: data.salt,
        iv: data.iv,
      },
      password
    );

    if (!secretKeyBs58) {
      setLoading(false);
      return { success: false, error: "Incorrect password" };
    }

    setSessionKeypair(getKeypairFromSecretKey(secretKeyBs58));
    setPublicKey(data.public_key);
    setLoading(false);
    return { success: true };
  }, [supabase]);

  const lockWallet = useCallback(() => {
    setSessionKeypair(null);
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!publicKey) return;
    try {
      const lamports = await connection.getBalance(new PublicKey(publicKey));
      setBalanceSol(lamports / 1_000_000_000);
    } catch (err) {
      console.error("Error fetching balance:", err);
    }
  }, [publicKey]);

  const getKeypair = useCallback(() => sessionKeypair, [sessionKeypair]);

  const sendSol = useCallback(async (recipientAddress: string, amountSol: number): Promise<SendResult> => {
    if (!sessionKeypair) {
      return { success: false, error: "Wallet is locked. Unlock it first." };
    }

    try {
      const recipient = new PublicKey(recipientAddress);
      const lamports = Math.floor(amountSol * 1_000_000_000);

      if (lamports <= 0) {
        return { success: false, error: "Amount must be greater than 0." };
      }

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: sessionKeypair.publicKey,
          toPubkey: recipient,
          lamports,
        })
      );

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = sessionKeypair.publicKey;
      transaction.sign(sessionKeypair);

      const signature = await connection.sendRawTransaction(transaction.serialize());
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

      await refreshBalance();

      return { success: true, signature };
    } catch (err: any) {
      return { success: false, error: err.message || "Transaction failed" };
    }
  }, [sessionKeypair, refreshBalance]);

  useEffect(() => {
    if (!publicKey || !sessionKeypair) return;
    void refreshBalance();
    const interval = setInterval(() => {
      void refreshBalance();
    }, 12000);
    return () => clearInterval(interval);
  }, [publicKey, sessionKeypair, refreshBalance]);

  return (
    <WalletSessionContext.Provider
      value={{
        publicKey,
        hasWallet,
        isUnlocked: !!sessionKeypair,
        balanceSol,
        loading,
        checkWallet,
        createWallet,
        unlockWallet,
        lockWallet,
        refreshBalance,
        getKeypair,
        sendSol,
      }}
    >
      {children}
    </WalletSessionContext.Provider>
  );
}

export function useWalletSession() {
  const ctx = useContext(WalletSessionContext);
  if (!ctx) throw new Error("useWalletSession must be used within WalletSessionProvider");
  return ctx;
}
