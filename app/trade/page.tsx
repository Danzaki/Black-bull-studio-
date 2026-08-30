'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import AppShell from '@/components/layout/AppShell';

export default function TradePage() {
  const { publicKey, connected } = useWallet();

  return (
    <AppShell>
      <main className="min-h-screen bg-black text-white p-6 pb-24">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold text-[#f5b942] mb-6">Trade</h1>

          <div className="rounded-2xl border border-[#f5b942]/30 bg-zinc-900 p-6 text-center">
            <WalletMultiButton />

            {connected && publicKey && (
              <p className="mt-4 text-xs text-zinc-400 break-all">
                Connected: {publicKey.toBase58()}
              </p>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
