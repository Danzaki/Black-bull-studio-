"use client";

import FixtureCards from "@/components/explore/FixtureCards";
import NewsList from "@/components/explore/NewsList";
import TrendingList from "@/components/explore/TrendingList";

export default function TodayNews({ onMore }: { onMore: () => void }) {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-4">
      <FixtureCards />
      <h2 className="mt-4 text-xl font-bold text-white">Today&apos;s News</h2>
      <NewsList limit={4} />
      <button type="button" onClick={onMore} className="py-3 text-sm font-semibold text-[#f5b942]">
        Show more
      </button>
      <TrendingList limit={3} hideWhenEmpty />
    </section>
  );
}
