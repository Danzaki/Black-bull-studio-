"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import DisclaimerContent from "@/components/DisclaimerContent";

export default function DisclaimerPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen w-full bg-bbl-bg text-stone-900">
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b border-stone-900/10 bg-bbl-bg/95 px-4 py-3 backdrop-blur-md">
        <button onClick={() => router.back()} aria-label="Back" className="text-stone-700">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-bold">Risk Disclosure</h1>
      </header>
      <div className="mx-auto max-w-xl p-4">
        <DisclaimerContent variant="community" />
      </div>
    </div>
  );
}
