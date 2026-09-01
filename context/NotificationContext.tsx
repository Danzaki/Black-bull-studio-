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

  useEffect(() => {
    void fetchNotifications();
    void checkPriceAlerts();
    const interval = setInterval(checkPriceAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, checkPriceAlerts]);

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
