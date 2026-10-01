import React from "react";

const actions = [
  {
    title: "Create Meme",
    icon: "🎨",
    description: "Create your next viral meme",
  },
  {
    title: "Join Challenge",
    icon: "🏆",
    description: "Participate in community challenges",
  },
  {
    title: "Upload Art",
    icon: "🖼️",
    description: "Share your artwork",
  },
];

export default function QuickActions() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {actions.map((action) => (
        <div
          key={action.title}
          className="cursor-pointer rounded-2xl border border-stone-900/10 bg-stone-900/[0.05] p-5 transition-all duration-200 hover:border-[#f97316]/30 hover:bg-stone-900/[0.06] active:scale-[0.98]"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#f97316]/10 text-2xl">
            {action.icon}
          </div>

          <h3 className="mt-3 text-base font-bold text-stone-900">
            {action.title}
          </h3>

          <p className="mt-1.5 text-sm text-stone-500">
            {action.description}
          </p>
        </div>
      ))}
    </div>
  );
}
