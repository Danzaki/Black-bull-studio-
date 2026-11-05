"use client";

import TerminalPageHeader from "@/components/layout/TerminalPageHeader";
import DisclaimerContent from "@/components/DisclaimerContent";

export default function TerminalDisclaimerPage() {
  return (
    <div className="min-h-screen bg-bb-bg text-zinc-100">
      <TerminalPageHeader title="Risk Disclosure" />
      <div className="px-3 py-2">
        <DisclaimerContent variant="terminal" />
      </div>
    </div>
  );
}
