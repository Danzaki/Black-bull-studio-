export default function UserProfileCard() {
  return (
    <div className="rounded-2xl border border-yellow-500/30 bg-zinc-900 p-6">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-yellow-500 flex items-center justify-center text-2xl font-bold text-black">
          H
        </div>

        <div>
          <h2 className="text-xl font-bold text-white">
            Haruna Abubakar
          </h2>

          <p className="text-yellow-400 text-sm">
            Premium Creator
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="text-center">
          <p className="text-2xl font-bold">0</p>
          <p className="text-zinc-400 text-sm">Memes</p>
        </div>

        <div className="text-center">
          <p className="text-2xl font-bold">0</p>
          <p className="text-zinc-400 text-sm">Wins</p>
        </div>

        <div className="text-center">
          <p className="text-2xl font-bold">0</p>
          <p className="text-zinc-400 text-sm">Followers</p>
        </div>
      </div>

      <button className="w-full mt-6 rounded-xl bg-yellow-500 py-3 font-semibold text-black hover:bg-yellow-400 transition">
        Edit Profile
      </button>
    </div>
  );
}