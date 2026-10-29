"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function TerminalPageHeader({ title, right }: { title: string; right?: ReactNode }) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-bb-border bg-bb-bg/80 px-2 backdrop-blur-xl backdrop-saturate-150">
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Back"
        className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-400 active:bg-bb-raised"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h1 className="text-base font-bold text-white">{title}</h1>
      {right && <div className="ml-auto">{right}</div>}
    </header>
  );
}
