'use client';
import dynamic from 'next/dynamic';
import { Component, type ReactNode } from 'react';

// Lazy-loaded: adds nothing to the initial bundle.
const AIShell = dynamic(() => import('./AIShell'), { ssr: false });

class Boundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(e: unknown) {
    console.error('[AI] crashed, app continues:', e);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function AIRoot() {
  // Kill switch: set NEXT_PUBLIC_AI_ENABLED=false (or remove) and rebuild.
  if (process.env.NEXT_PUBLIC_AI_ENABLED !== 'true') return null;
  return (
    <Boundary>
      <AIShell />
    </Boundary>
  );
}
