"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { requestNotificationPermission as requestPushToken } from "@/lib/firebaseClient";

type Status = "idle" | "checking" | "enabling" | "on" | "off" | "unsupported" | "error";

export default function NotificationToggle() {
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setStatus("unsupported");
      return;
    }
    setStatus(Notification.permission === "granted" ? "on" : "off");
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

      const res = await fetch("/api/save-push-token", {
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
      <div className="rounded-xl border border-stone-800 bg-white/60 p-4 text-sm text-stone-500">
        Push notifications are not supported on this browser.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stone-800 bg-white/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {status === "on" ? (
            <BellRing className="h-5 w-5 text-emerald-600" />
          ) : (
            <BellOff className="h-5 w-5 text-stone-500" />
          )}
          <div>
            <p className="text-sm font-bold text-stone-900">Push Notifications</p>
            <p className="text-[11px] text-stone-500">
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
            className="flex items-center gap-1.5 rounded-full bg-[#f97316] px-4 py-2 text-xs font-bold text-black transition hover:bg-[#f97316]/90 disabled:opacity-50"
          >
            <Bell className="h-3.5 w-3.5" />
            {status === "enabling" ? "Enabling..." : "Enable"}
          </button>
        )}
      </div>

      {message && <p className="mt-3 text-xs text-rose-400">{message}</p>}
    </div>
  );
}
