import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Bricolage_Grotesque } from 'next/font/google';

const display = Bricolage_Grotesque({ subsets: ['latin'], display: 'swap', variable: '--font-bx-display' });

export const viewport: Viewport = { themeColor: '#f7f5f2' };

const appId = process.env.NEXT_PUBLIC_BASE_APP_ID;

export const metadata: Metadata = {
  title: 'Base Safety | Black Bull',
  description: 'Paste a Base token address and see the red flags before you buy.',
  ...(appId ? { other: { 'base:app_id': appId } } : {}),
};

export default function BaseLayout({ children }: { children: ReactNode }) {
  return (
    <div className={display.variable + ' min-h-screen bg-bx-bg text-bx-text'}>
      {children}
    </div>
  );
}
