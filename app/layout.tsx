import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import WalletContextProvider from '@/context/WalletContextProvider';
import { WalletSessionProvider } from '@/context/WalletSessionContext';
import { NotificationProvider } from '@/context/NotificationContext';
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
      <body className="min-h-screen bg-black font-sans text-white antialiased">
        <WalletContextProvider>
          <AuthProvider>
            <WalletSessionProvider>
              <NotificationProvider>{children}</NotificationProvider>
            </WalletSessionProvider>
          </AuthProvider>
        </WalletContextProvider>
      </body>
    </html>
  );
}
