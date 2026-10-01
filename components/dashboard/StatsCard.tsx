import React from "react";

interface StatsCardProps {
  title: string;
  value: string;
  icon?: string;
}

export default function StatsCard({
  title,
  value,
  icon,
}: StatsCardProps) {
  return (
    <div className="rounded-2xl border border-stone-900/10 bg-stone-900/[0.05] p-5 transition-all duration-200 hover:border-stone-900/15 hover:bg-stone-900/[0.06]">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">{title}</h3>
        <span className="text-xl">{icon}</span>
      </div>

      <p className="mt-3 text-3xl font-black tabular-nums text-stone-900">
        {value}
      </p>
    </div>
  );
}
