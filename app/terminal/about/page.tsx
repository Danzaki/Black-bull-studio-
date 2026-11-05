"use client";

import TerminalPageHeader from "@/components/layout/TerminalPageHeader";
import AboutContent from "@/components/AboutContent";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-bb-bg text-zinc-100">
      <TerminalPageHeader title="About Black Bull" />
      <div className="px-3 py-2">
        <AboutContent variant="terminal" />
      </div>
    </div>
  );
}
