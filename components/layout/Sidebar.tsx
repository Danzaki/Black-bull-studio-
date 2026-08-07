const menuItems = [
  { name: "Dashboard", icon: "🏠" },
  { name: "AI Studio", icon: "🎨" },
  { name: "Challenges", icon: "🏆" },
  { name: "Community", icon: "👥" },
  { name: "Analytics", icon: "📊" },
  { name: "Profile", icon: "👤" },
  { name: "Settings", icon: "⚙️" },
];

export default function Sidebar() {
  return (
    <aside className="w-72 min-h-screen bg-zinc-950 border-r border-zinc-800 p-6">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-yellow-400">
          🐂 Black Bull
        </h1>

        <p className="text-zinc-500 text-sm mt-2">
          Premium AI Creative Studio
        </p>
      </div>

      <nav className="space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.name}
            className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left text-zinc-300 transition hover:bg-yellow-500 hover:text-black"
          >
            <span>{item.icon}</span>
            <span>{item.name}</span>
          </button>
        ))}
      </nav>

      <div className="mt-12 rounded-2xl border border-yellow-500/30 bg-zinc-900 p-4">
        <p className="text-yellow-400 font-semibold">
          🚀 Black Bull Studio
        </p>

        <p className="text-sm text-zinc-400 mt-2">
          Build premium AI campaigns with confidence.
        </p>
      </div>
    </aside>
  );
}
