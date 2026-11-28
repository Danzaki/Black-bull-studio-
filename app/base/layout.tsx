import type { Metadata, Viewport } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import { Bricolage_Grotesque } from 'next/font/google';

const display = Bricolage_Grotesque({ subsets: ['latin'], display: 'swap', variable: '--font-bx-display' });

export const viewport: Viewport = { themeColor: '#050505' };

const appId = process.env.NEXT_PUBLIC_BASE_APP_ID;

export const metadata: Metadata = {
  title: 'Base Safety | Black Bull',
  description: 'Paste a Base token address and see the red flags before you buy.',
  ...(appId ? { other: { 'base:app_id': appId } } : {}),
};

// Terminal palette, always dark (does not follow Light/Dark setting)
const THEME = {
  '--bx-bg': '5 5 5',
  '--bx-surface': '10 10 10',
  '--bx-border': '38 38 38',
  '--bx-text': '245 245 245',
  '--bx-muted': '133 133 133',
  '--bx-accent': '249 115 22',
  colorScheme: 'dark',
} as CSSProperties;

export default function BaseLayout({ children }: { children: ReactNode }) {
  return (
    <div className={display.variable + ' min-h-screen bg-bx-bg text-bx-text'} style={THEME}>
      {children}
    </div>
  );
}
