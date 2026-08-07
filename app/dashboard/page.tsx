import DashboardHeader from "@/components/dashboard/DashboardHeader";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">

        <DashboardHeader />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

          <div className="rounded-2xl border border-yellow-500/30 bg-zinc-900 p-6">
            <h2 className="text-gray-400">Memes Created</h2>
            <p className="text-3xl font-bold mt-2">0</p>
          </div>

          <div className="rounded-2xl border border-yellow-500/30 bg-zinc-900 p-6">
            <h2 className="text-gray-400">Challenges</h2>
            <p className="text-3xl font-bold mt-2">0</p>
          </div>

          <div className="rounded-2xl border border-yellow-500/30 bg-zinc-900 p-6">
            <h2 className="text-gray-400">Followers</h2>
            <p className="text-3xl font-bold mt-2">0</p>
          </div>

          <div className="rounded-2xl border border-yellow-500/30 bg-zinc-900 p-6">
            <h2 className="text-gray-400">Notifications</h2>
            <p className="text-3xl font-bold mt-2">0</p>
          </div>

        </div>
      </div>
    </main>
  );
}