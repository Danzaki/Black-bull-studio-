"use client";

import TerminalPageHeader from "@/components/layout/TerminalPageHeader";
import LegalContent from "@/components/LegalContent";

export default function TerminalPrivacyPage() {
  return (
    <div className="min-h-screen bg-bb-bg text-zinc-100">
      <TerminalPageHeader title="Privacy Policy" />
      <div className="p-4">
        <LegalContent kind="privacy" variant="terminal" />
      </div>
    </div>
  );
}
