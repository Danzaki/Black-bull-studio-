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
    <div className="rounded-2xl border border-white/10 bg-black/40 p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <h3 className="text-sm text-gray-400">{title}</h3>
        <span className="text-xl">{icon}</span>
      </div>

      <p className="mt-3 text-3xl font-bold text-white">
        {value}
      </p>
    </div>
  );
}
