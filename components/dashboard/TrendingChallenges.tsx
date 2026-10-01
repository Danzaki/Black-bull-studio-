import React from "react";

const challenges = [
  {
    title: "Meme Battle 2026",
    participants: "2.4K participants",
    reward: "🏆 500 Points",
  },
  {
    title: "AI Art Challenge",
    participants: "1.8K participants",
    reward: "🔥 300 Points",
  },
  {
    title: "Community Creator Week",
    participants: "950 participants",
    reward: "⭐ 200 Points",
  },
];

export default function TrendingChallenges() {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-5 shadow-lg">
      <h2 className="text-xl font-bold text-white">
        Trending Challenges
      </h2>

      <div className="mt-4 space-y-4">
        {challenges.map((challenge) => (
          <div
            key={challenge.title}
            className="rounded-xl border border-white/10 p-4"
          >
            <h3 className="font-bold text-white">
              {challenge.title}
            </h3>

            <p className="mt-1 text-sm text-gray-400">
              {challenge.participants}
            </p>

            <p className="mt-2 text-sm text-gray-300">
              {challenge.reward}
            </p>

            <button className="mt-3 rounded-lg bg-white/10 px-4 py-2 text-sm text-white">
              Join Challenge
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
