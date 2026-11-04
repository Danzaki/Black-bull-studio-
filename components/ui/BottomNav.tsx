"use client";

import Link from "next/link";
import { Compass, Zap, Activity, Users, User } from "lucide-react";

export const NAV_ITEMS = [
  { key: "discover", label: "Discover", href: "/discover", Icon: Compass },
  { key: "trenches", label: "Trenches", href: "/terminal/trenches", Icon: Zap },
  { key: "track", label: "Track", href: "/terminal/track", Icon: Activity },
  { key: "traders", label: "Traders", href: "/terminal/traders", Icon: Users },
  { key: "you", label: "You", href: "/terminal/you", Icon: User },
] as const;

export default function BottomNav({ active }: { active: (typeof NAV_ITEMS)[number]["key"] }) {
  return (
    <nav className="bb-safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-bb-border bg-bb-bg/95 backdrop-blur">
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {NAV_ITEMS.map(({ key, label, href, Icon }) => {
          const on = key === active;
          return (
            <li key={key}>
              <Link
                href={href}
                className={
                  "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium " +
                  (on ? "text-bb-accent" : "text-zinc-500")
                }
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
