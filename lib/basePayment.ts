import { createPublicClient, http, parseEventLogs, erc20Abi, getAddress, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { getChain } from '@/lib/chains';

export const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export async function checkBaseUsdcPayment(opts: {
  hash: `0x${string}`;
  from: string;
  to: string;
  minUsdc: number;
  maxAgeSeconds?: number;
}): Promise<{ ok: boolean; error?: string; usdcAmount?: number }> {
  const client = createPublicClient({ chain: base, transport: http(getChain('base').rpcUrl) });

  let receipt;
  try {
    receipt = await client.waitForTransactionReceipt({ hash: opts.hash, timeout: 25_000 });
  } catch {
    return { ok: false, error: 'Transaction not confirmed yet. Wait a few seconds and try again. Do not pay again.' };
  }
  if (receipt.status !== 'success') return { ok: false, error: 'Transaction failed on chain' };

  const block = await client.getBlock({ blockNumber: receipt.blockNumber });
  const maxAge = opts.maxAgeSeconds ?? 900;
  if (Date.now() / 1000 - Number(block.timestamp) > maxAge) return { ok: false, error: 'Transaction is too old' };

  const logs = parseEventLogs({ abi: erc20Abi, eventName: 'Transfer', logs: receipt.logs });
  const min = parseUnits(String(opts.minUsdc), 6);
  const usdc = getAddress(BASE_USDC);
  const from = getAddress(opts.from);
  const to = getAddress(opts.to);

  const hit = logs.find(
    (l) =>
      getAddress(l.address) === usdc &&
      getAddress(l.args.from) === from &&
      getAddress(l.args.to) === to &&
      l.args.value >= min
  );
  if (!hit) return { ok: false, error: 'No valid USDC payment from your wallet found' };
  return { ok: true, usdcAmount: Number(hit.args.value) / 1e6 };
}
