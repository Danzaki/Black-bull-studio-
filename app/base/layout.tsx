import type { Metadata, Viewport } from 'next';
import type { CSSProperties, ReactNode } from 'react';
import { Bricolage_Grotesque } from 'next/font/google';

const display = Bricolage_Grotesque({ subsets: ['latin'], display: 'swap', variable: '--font-bx-display' });

export const viewport: Viewport = { themeColor: '#060a14' };

const appId = process.env.NEXT_PUBLIC_BASE_APP_ID;

export const metadata: Metadata = {
  title: 'Base Safety | Black Bull',
  description: 'Paste a Base token address and see the red flags before you buy.',
  ...(appId ? { other: { 'base:app_id': appId } } : {}),
};

const THEME = {
  '--bx-bg': '6 10 20',
  '--bx-surface': '13 20 38',
  '--bx-border': '38 50 80',
  '--bx-text': '234 240 255',
  '--bx-muted': '138 151 181',
  '--bx-accent': '0 82 255',
} as CSSProperties;

export default function BaseLayout({ children }: { children: ReactNode }) {
  return (
    <div className={display.variable + ' min-h-screen bg-bx-bg text-bx-text'} style={THEME}>
      {children}
    </div>
  );
}
