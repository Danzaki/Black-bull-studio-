import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get('address');
  if (!address || address.length < 32 || address.length > 44) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  const key = process.env.HELIUS_API_KEY || (process.env.HELIUS_API_KEY ?? process.env.NEXT_PUBLIC_HELIUS_API_KEY);
  const endpoints = [
    ...(key ? ['https://mainnet.helius-rpc.com/?api-key=' + key] : []),
    'https://api.mainnet-beta.solana.com',
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBalance', params: [address] }),
        cache: 'no-store',
      });
      const json = await res.json();
      const lamports = json?.result?.value;
      if (res.ok && typeof lamports === 'number') {
        return NextResponse.json({ sol: lamports / 1_000_000_000 });
      }
    } catch {}
  }
  return NextResponse.json({ error: 'Balance unavailable' }, { status: 502 });
}
