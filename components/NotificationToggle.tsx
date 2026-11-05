"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { requestNotificationPermission as requestPushToken } from "@/lib/firebaseClient";
import { authedFetch } from "@/lib/authedFetch";

type Status = "idle" | "checking" | "enabling" | "on" | "off" | "unsupported" | "error";

export default function NotificationToggle({ dark = false }: { dark?: boolean }) {
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    const granted = Notification.permission === "granted";
    setStatus(granted ? "on" : "off");
    if (granted) {
      requestPushToken()
        .then(async (token) => {
          if (!token) {
            console.warn("Push token unavailable");
            return;
          }
          const r = await authedFetch("/api/save-push-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) console.warn("Push token save failed:", j.error || r.status);
        })
        .catch((e) => console.warn("Push token error:", e));
    }
  }, []);

  async function handleEnable() {
    setStatus("enabling");
    setMessage("");

    try {
      const token = await requestPushToken();

      if (!token) {
        setStatus("off");
        setMessage("Notification permission was not granted.");
        return;
      }

      const res = await authedFetch("/api/save-push-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save token");
      }

      setStatus("on");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "unsupported") {
    return (
      <div className={dark ? "rounded-xl border border-bb-border bg-bb-surface px-3 py-2 text-[12px] text-zinc-500" : "rounded-xl border border-stone-800 bg-white/60 p-4 text-sm text-stone-500"}>
        Push notifications are not supported on this browser.
      </div>
    );
  }

  return (
    <div className={dark ? "rounded-xl border border-bb-border bg-bb-surface px-3 py-2" : "rounded-xl border border-stone-800 bg-white/60 p-4"}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {status === "on" ? (
            <BellRing className={dark ? "h-4 w-4 text-bb-up" : "h-5 w-5 text-emerald-600"} />
          ) : (
            <BellOff className={dark ? "h-4 w-4 text-zinc-500" : "h-5 w-5 text-stone-500"} />
          )}
          <div>
            <p className={dark ? "text-[13px] font-semibold text-white" : "text-sm font-bold text-stone-900"}>Push Notifications</p>
            <p className={dark ? "text-[11px] text-zinc-500" : "text-[11px] text-stone-500"}>
              {status === "on"
                ? "Enabled on this device."
                : "Get alerts for likes, comments and trading signals."}
            </p>
          </div>
        </div>

        {status !== "on" && (
          <button
            type="button"
            onClick={handleEnable}
            disabled={status === "enabling" || status === "checking"}
            className={dark ? "flex items-center gap-1 rounded-lg bg-bb-accent px-2.5 py-1.5 text-[11px] font-bold text-black transition active:scale-95 disabled:opacity-50" : "flex items-center gap-1.5 rounded-full bg-bbl-accent px-4 py-2 text-xs font-bold text-black transition hover:bg-bbl-accent/90 disabled:opacity-50"}
          >
            <Bell className="h-3.5 w-3.5" />
            {status === "enabling" ? "Enabling..." : "Enable"}
          </button>
        )}
      </div>

      {message && <p className="mt-2 text-[11px] text-bb-down">{message}</p>}
    </div>
  );
}
