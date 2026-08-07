const notifications = [
  {
    title: "Welcome to Black Bull Studio",
    message: "Your dashboard is ready.",
  },
  {
    title: "Challenge Available",
    message: "A new meme challenge has started.",
  },
  {
    title: "AI Studio",
    message: "Generate your first premium campaign.",
  },
];

export default function NotificationPanel() {
  return (
    <div className="rounded-2xl border border-yellow-500/30 bg-zinc-900 p-6">
      <h2 className="text-xl font-bold text-yellow-400 mb-4">
        🔔 Notifications
      </h2>

      <div className="space-y-4">
        {notifications.map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-zinc-800 bg-black/40 p-4"
          >
            <h3 className="font-semibold text-white">{item.title}</h3>
            <p className="mt-1 text-sm text-zinc-400">
              {item.message}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}