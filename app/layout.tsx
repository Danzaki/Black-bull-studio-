import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import QueryProvider from '@/components/providers/QueryProvider';
import { AuthProvider } from '@/context/AuthContext';
import { WalletSessionProvider } from '@/context/WalletSessionContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ToastProvider } from '@/components/ToastProvider';
import PushListener from '@/components/PushListener';
import SWRegister from '@/components/SWRegister';
import './globals.css';

export const metadata: Metadata = {
  title: 'Black Bull Studio',
  description:
    'Black Bull Studio is a premium AI creative studio for building brand-driven campaigns, meme experiences, and community workflows.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#f7f5f2] font-sans text-stone-900 antialiased">
        <QueryProvider>
          <AuthProvider>
            <WalletSessionProvider>
              <NotificationProvider>
                <ToastProvider>
                  <PushListener />
                  <SWRegister />
                  {children}
                </ToastProvider>
              </NotificationProvider>
            </WalletSessionProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
