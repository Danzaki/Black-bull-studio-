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
      className={`flex items-center gap-1 rounded-full border border-stone-900/10 bg-stone-900/[0.05] p-0.5 ${className}`}
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
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold transition-all duration-200 active:scale-95 ${
              active
                ? "bg-[#f97316] text-black"
                : "text-stone-600 hover:bg-stone-900/[0.06] hover:text-stone-900"
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
