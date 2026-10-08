import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';

const heliusKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
const RPC_URL =
  process.env.SOLANA_RPC_URL ||
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  (heliusKey ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}` : 'https://api.mainnet-beta.solana.com');

export async function checkPayment(opts: {
  signature: string;
  from: string;
  to: string;
  minSol: number;
  maxAgeSeconds?: number;
}): Promise<{ ok: boolean; error?: string; solAmount?: number }> {
  const connection = new Connection(RPC_URL, 'confirmed');
  const tx = await connection.getParsedTransaction(opts.signature, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  });
  if (!tx || tx.meta?.err) return { ok: false, error: 'Transaction not found or failed' };

  const maxAge = opts.maxAgeSeconds ?? 900;
  if (!tx.blockTime || Date.now() / 1000 - tx.blockTime > maxAge) {
    return { ok: false, error: 'Transaction is too old' };
  }

  const ixs = tx.transaction.message.instructions as any[];
  const ix = ixs.find(
    (i) =>
      i.program === 'system' &&
      i.parsed?.type === 'transfer' &&
      i.parsed.info?.destination === opts.to &&
      i.parsed.info?.source === opts.from
  );
  if (!ix) return { ok: false, error: 'No valid payment from your wallet found' };

  const solAmount = Number(ix.parsed.info.lamports) / LAMPORTS_PER_SOL;
  if (solAmount < opts.minSol) return { ok: false, error: 'Insufficient payment amount' };
  return { ok: true, solAmount };
}
