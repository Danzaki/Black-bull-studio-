import React from "react";

const activities = [
  {
    icon: "🎨",
    title: "Created a new meme",
    time: "2 minutes ago",
  },
  {
    icon: "🏆",
    title: "Completed a community challenge",
    time: "1 hour ago",
  },
  {
    icon: "🔥",
    title: "Joined trending challenge",
    time: "3 hours ago",
  },
];

export default function RecentActivity() {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-5 shadow-lg">
      <h2 className="text-xl font-bold text-white">
        Recent Activity
      </h2>

      <div className="mt-4 space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.title}
            className="flex items-center gap-4 rounded-xl border border-white/10 p-3"
          >
            <span className="text-2xl">
              {activity.icon}
            </span>

            <div>
              <p className="font-medium text-white">
                {activity.title}
              </p>

              <p className="text-sm text-gray-400">
                {activity.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
