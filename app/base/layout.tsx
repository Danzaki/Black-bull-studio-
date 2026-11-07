import type { Metadata } from 'next';
import type { ReactNode } from 'react';

const appId = process.env.NEXT_PUBLIC_BASE_APP_ID;

export const metadata: Metadata = {
  title: 'Base Safety | Black Bull',
  description: 'Paste a Base token address and see the red flags before you buy.',
  ...(appId ? { other: { 'base:app_id': appId } } : {}),
};

export default function BaseLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
