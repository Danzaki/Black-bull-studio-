"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";

type Who = "everyone" | "following" | "nobody";

const WHO_OPTIONS: { value: Who; label: string; hint: string }[] = [
  { value: "everyone", label: "Everyone", hint: "Anyone can message you." },
  { value: "following", label: "People I follow", hint: "Only people you follow can message you." },
  { value: "nobody", label: "No one", hint: "Pause new messages." },
];

function Toggle({
  on,
  onChange,
  label,
  hint,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-stone-900/10 bg-white px-4 py-4 text-left"
    >
      <span>
        <span className="block text-sm font-semibold text-stone-900">{label}</span>
        <span className="mt-1 block text-xs text-stone-500">{hint}</span>
      </span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-[#f97316]" : "bg-stone-300"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

export default function ChatSettingsPage() {
  const supabase = getSupabaseClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [who, setWho] = useState<Who>("everyone");
  const [readReceipts, setReadReceipts] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (alive) setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("chat_settings")
        .select("who_can_message, read_receipts, message_notifications")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!alive) return;
      setUserId(user.id);
      if (data) {
        setWho(data.who_can_message as Who);
        setReadReceipts(data.read_receipts);
        setNotifications(data.message_notifications);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save(next: { who: Who; readReceipts: boolean; notifications: boolean }) {
    if (!userId) return;
    setStatus("Saving...");
    const { error } = await supabase.from("chat_settings").upsert({
      user_id: userId,
      who_can_message: next.who,
      read_receipts: next.readReceipts,
      message_notifications: next.notifications,
      updated_at: new Date().toISOString(),
    });
    setStatus(error ? "Could not save: " + error.message : "Saved");
  }

  function changeWho(v: Who) {
    setWho(v);
    void save({ who: v, readReceipts, notifications });
  }
  function changeReceipts(v: boolean) {
    setReadReceipts(v);
    void save({ who, readReceipts: v, notifications });
  }
  function changeNotifications(v: boolean) {
    setNotifications(v);
    void save({ who, readReceipts, notifications: v });
  }

  return (
    <main className="mx-auto w-full max-w-xl px-4 pb-24 pt-4 text-stone-900">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/chat" className="rounded-full p-2 hover:bg-stone-900/5" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">Chat settings</h1>
      </div>

      {loading ? (
        <p className="text-sm text-stone-500">Loading...</p>
      ) : !userId ? (
        <p className="text-sm text-stone-600">
          Please{" "}
          <Link href="/auth/sign-in" className="font-semibold text-[#f97316] underline">
            sign in
          </Link>{" "}
          to change your chat settings.
        </p>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-stone-500">
              Who can message you
            </h2>
            <div className="space-y-2">
              {WHO_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => changeWho(o.value)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                    who === o.value ? "border-[#f97316] bg-[#f97316]/10" : "border-stone-900/10 bg-white"
                  }`}
                >
                  <span className="block text-sm font-semibold">{o.label}</span>
                  <span className="mt-1 block text-xs text-stone-500">{o.hint}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-stone-500">Privacy</h2>
            <Toggle
              on={readReceipts}
              onChange={changeReceipts}
              label="Read receipts"
              hint="Let others see when you have read their message."
            />
          </section>

          <section className="space-y-2">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-stone-500">Notifications</h2>
            <Toggle
              on={notifications}
              onChange={changeNotifications}
              label="Message notifications"
              hint="Get a push notification for new messages."
            />
          </section>

          <p className="text-xs text-stone-500">{status}</p>
        </div>
      )}
    </main>
  );
}
