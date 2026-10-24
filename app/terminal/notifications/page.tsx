"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Bell, TrendingUp, Wallet } from "lucide-react";
import { useNotifications } from "@/context/NotificationContext";

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, loading, unreadCount, markAllRead, markRead } = useNotifications();

  return (
    <div className="min-h-screen bg-bb-bg text-zinc-100">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-bb-border bg-bb-bg/95 backdrop-blur-xl px-3 py-2">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 hover:text-white active:bg-bb-raised">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-semibold text-white">Notifications</h1>
        </div>
        {unreadCount > 0 && (
          <button onClick={() => void markAllRead()} className="h-10 px-3 text-sm font-semibold text-bb-accent active:opacity-70">
            Mark all read
          </button>
        )}
      </header>

      <div className="p-4">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bb-skeleton h-16 w-full" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="h-8 w-8 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-500">No notifications yet.</p>
            <p className="text-sm text-zinc-500 mt-1">Set a price alert on any token to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => !n.is_read && void markRead(n.id)}
                className={`w-full flex items-start gap-3 min-h-[64px] p-3.5 rounded-xl border text-left active:scale-[0.99] transition-colors ${
                  n.is_read
                    ? "border-bb-border bg-bb-surface"
                    : "border-bb-accent/30 bg-bb-accent/10"
                }`}
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  n.type === "price_alert" ? "bg-bb-up/10 text-bb-up" : "bg-bb-accent/10 text-bb-accent"
                }`}>
                  {n.type === "price_alert" ? <TrendingUp className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-white">{n.title}</p>
                  <p className="text-sm text-zinc-400 mt-0.5">{n.message}</p>
                  <p className="text-xs text-zinc-500 mt-1">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && <span className="h-2 w-2 rounded-full bg-bb-accent shrink-0 mt-1.5" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
