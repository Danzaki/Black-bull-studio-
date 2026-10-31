"use client";

import TerminalPageHeader from "@/components/layout/TerminalPageHeader";
import LegalContent from "@/components/LegalContent";

export default function TerminalTermsPage() {
  return (
    <div className="min-h-screen bg-bb-bg text-zinc-100">
      <TerminalPageHeader title="Terms of Service" />
      <div className="p-4">
        <LegalContent kind="terms" variant="terminal" />
      </div>
    </div>
  );
}
