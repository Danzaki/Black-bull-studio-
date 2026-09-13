"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useWalletSession } from "./WalletSessionContext";

export interface TerminalNotification {
  id: string;
  type: "price_alert" | "wallet_activity";
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationContextValue {
  notifications: TerminalNotification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  createAlert: (params: { mint: string; poolAddress: string; symbol: string; targetPrice: number; direction: "above" | "below" }) => Promise<{ success: boolean; error?: string }>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const supabase = getSupabaseClient();
  const { balanceSol, isUnlocked } = useWalletSession();

  const [notifications, setNotifications] = useState<TerminalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const prevBalanceRef = useRef<number | null>(null);

  const fetchNotifications = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("terminal_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching notifications:", error.message);
    } else {
      setNotifications(data ?? []);
    }
    setLoading(false);
  }, [supabase]);

  const checkPriceAlerts = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: alerts } = await supabase
      .from("price_alerts")
      .select("*")
      .eq("user_id", user.id)
      .eq("triggered", false);

    if (!alerts || alerts.length === 0) return;

    for (const alert of alerts) {
      try {
        const res = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${alert.pool_address}`);
        if (!res.ok) continue;
        const json = await res.json();
        const currentPrice = json.data?.attributes?.base_token_price_usd
          ? parseFloat(json.data.attributes.base_token_price_usd)
          : null;
        if (currentPrice === null) continue;

        const hit =
          (alert.direction === "above" && currentPrice >= alert.target_price) ||
          (alert.direction === "below" && currentPrice <= alert.target_price);

        if (hit) {
          await supabase.from("price_alerts").update({ triggered: true }).eq("id", alert.id);
          await supabase.from("terminal_notifications").insert({
            user_id: user.id,
            type: "price_alert",
            title: `${alert.token_symbol} price alert`,
            message: `${alert.token_symbol} is now $${currentPrice.toFixed(6)} (target: ${alert.direction} $${alert.target_price})`,
          });
        }
      } catch (err) {
        console.error("Error checking alert:", err);
      }
    }

    void fetchNotifications();
  }, [supabase, fetchNotifications]);

  const checkWalletActivity = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: watched } = await supabase
      .from("watched_wallets")
      .select("*")
      .eq("user_id", user.id)
      .eq("monitoring_enabled", true);

    if (!watched || watched.length === 0) return;

    const heliusKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    if (!heliusKey) return;

    const WSOL_MINT = "So11111111111111111111111111111111111111112";

    for (const w of watched) {
      try {
        const url = `https://api.helius.xyz/v0/addresses/${encodeURIComponent(
          w.wallet_address
        )}/transactions?api-key=${heliusKey}&type=SWAP&limit=10`;

        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) continue;

        const txs = await res.json();
        if (!Array.isArray(txs)) continue;

        for (const tx of txs) {
          const tokenTransfers = Array.isArray(tx.tokenTransfers) ? tx.tokenTransfers : [];
          const nonSolLeg = tokenTransfers.find((t: any) => t.mint !== WSOL_MINT);
          if (!nonSolLeg) continue;

          const isBuy = nonSolLeg.toUserAccount === w.wallet_address;
          const isSell = nonSolLeg.fromUserAccount === w.wallet_address;
          if (!isBuy && !isSell) continue;

          const { data: seenRows } = await supabase
            .from("wallet_activity_seen")
            .select("id")
            .eq("user_id", user.id)
            .eq("wallet_address", w.wallet_address)
            .eq("tx_hash", tx.signature)
            .maybeSingle();

          if (seenRows) continue;

          await supabase.from("wallet_activity_seen").insert({
            user_id: user.id,
            wallet_address: w.wallet_address,
            tx_hash: tx.signature,
          });

          const symbol = nonSolLeg.mint ? `${nonSolLeg.mint.slice(0, 4)}...${nonSolLeg.mint.slice(-4)}` : "a token";
          const amount = Math.abs(nonSolLeg.tokenAmount ?? 0);

          await supabase.from("terminal_notifications").insert({
            user_id: user.id,
            type: "wallet_activity",
            title: `${w.label} ${isBuy ? "bought" : "sold"}`,
            message: `${w.label} ${isBuy ? "bought" : "sold"} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} of ${symbol}`,
          });
        }
      } catch (err) {
        console.error("Error checking wallet activity:", err);
      }
    }

    void fetchNotifications();
  }, [supabase, fetchNotifications]);

  useEffect(() => {
    void fetchNotifications();
    void checkPriceAlerts();
    void checkWalletActivity();
    const interval = setInterval(() => {
      void checkPriceAlerts();
      void checkWalletActivity();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, checkPriceAlerts, checkWalletActivity]);

  useEffect(() => {
    if (!isUnlocked || balanceSol === null) return;

    if (prevBalanceRef.current !== null && balanceSol > prevBalanceRef.current) {
      const received = balanceSol - prevBalanceRef.current;
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await supabase.from("terminal_notifications").insert({
          user_id: user.id,
          type: "wallet_activity",
          title: "SOL received",
          message: `Your wallet received ${received.toFixed(4)} SOL`,
        });
        void fetchNotifications();
      })();
    }

    prevBalanceRef.current = balanceSol;
  }, [balanceSol, isUnlocked, supabase, fetchNotifications]);

  const markAllRead = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("terminal_notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    void fetchNotifications();
  }, [supabase, fetchNotifications]);

  const markRead = useCallback(async (id: string) => {
    await supabase.from("terminal_notifications").update({ is_read: true }).eq("id", id);
    void fetchNotifications();
  }, [supabase, fetchNotifications]);

  const createAlert = useCallback(async (params: { mint: string; poolAddress: string; symbol: string; targetPrice: number; direction: "above" | "below" }) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not logged in" };

    const { error } = await supabase.from("price_alerts").insert({
      user_id: user.id,
      mint: params.mint,
      pool_address: params.poolAddress,
      token_symbol: params.symbol,
      target_price: params.targetPrice,
      direction: params.direction,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  }, [supabase]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, refresh: fetchNotifications, markAllRead, markRead, createAlert }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
