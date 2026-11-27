import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import QueryProvider from '@/components/providers/QueryProvider';
import { AuthProvider } from '@/context/AuthContext';
import { WalletSessionProvider } from '@/context/WalletSessionContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { ToastProvider } from '@/components/ToastProvider';
import PushListener from '@/components/PushListener';
import OnboardingGuard from '@/components/OnboardingGuard';
import SWRegister from '@/components/SWRegister';
import PostingBanner from '@/components/PostingBanner';
import OnlineRefresh from '@/components/OnlineRefresh';
import AIRoot from '@/components/ai/AIRoot';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

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
    <html lang="en" className={`dark ${inter.variable}`} data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{var p=localStorage.getItem('bb_theme')||'light';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light')}catch(e){}" }} />
      </head>
      <body className="min-h-screen bg-bbl-bg font-sans text-bbl-text antialiased">
        <QueryProvider>
          <AuthProvider>
            <WalletSessionProvider>
              <NotificationProvider>
                <ToastProvider>
                  <OnboardingGuard />
                  <PushListener />
                  <SWRegister />
                  <PostingBanner />
                  <OnlineRefresh />
                  <AIRoot />
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
