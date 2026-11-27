'use client';
import type { ReactNode } from 'react';

// Put anywhere (header, sidebar, a token page). No provider needed.
// <AskAITrigger prompt="Analyze this token">Analyze with AI</AskAITrigger>
export default function AskAITrigger({ prompt, className = '', children }: { prompt?: string; className?: string; children?: ReactNode }) {
  if (process.env.NEXT_PUBLIC_AI_ENABLED !== 'true') return null;
  return (
    <button
      type="button"
      className={className}
      onClick={() => window.dispatchEvent(new CustomEvent('bb:ai-open', { detail: { prompt } }))}
    >
      {children ?? 'Ask AI'}
    </button>
  );
}
