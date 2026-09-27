"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Activity, Sparkles } from "lucide-react";

const TABS = [
  {
    label: "Community",
    href: "/community",
    icon: Users,
    match: ["/community", "/explore", "/post", "/comment", "/profile", "/users", "/bookmarks", "/notifications", "/chat", "/create-post", "/search", "/settings"],
  },
  {
    label: "Terminal",
    href: "/terminal",
    icon: Activity,
    match: ["/terminal", "/trade"],
  },
  {
    label: "Studio",
    href: "/studio",
    icon: Sparkles,
    match: ["/studio"],
  },
];

export default function AppSwitcher({ className = "" }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Switch app section"
      className={`flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-0.5 ${className}`}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = tab.match.some(
          (p) => pathname === p || pathname.startsWith(p + "/")
        );
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition ${
              active
                ? "bg-[#f5b942] text-black"
                : "text-white/60 hover:text-white"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
