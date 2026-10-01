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
          className="rounded-2xl border border-white/10 bg-black/40 p-5 shadow-lg"
        >
          <div className="text-3xl">{action.icon}</div>

          <h3 className="mt-3 text-lg font-bold text-white">
            {action.title}
          </h3>

          <p className="mt-2 text-sm text-gray-400">
            {action.description}
          </p>
        </div>
      ))}
    </div>
  );
}
