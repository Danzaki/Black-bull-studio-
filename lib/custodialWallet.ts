import { createClient } from "@supabase/supabase-js";
import { Connection, Keypair } from "@solana/web3.js";
import { decryptSniperSecretKey, getSniperKeypairFromSecretKey } from "@/lib/sniperWalletCrypto";

export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase configuration is missing.");
  return createClient(url, key);
}

export function getConnection() {
  const k = (process.env.HELIUS_API_KEY ?? process.env.NEXT_PUBLIC_HELIUS_API_KEY);
  return new Connection(
    k ? `https://mainnet.helius-rpc.com/?api-key=${k}` : "https://api.mainnet-beta.solana.com",
    "confirmed"
  );
}

// Yana karanta wallet ɗin mai amfani ya buɗe shi a server. Kada a mayar da keypair ga client.
export async function loadCustodialKeypair(userId: string): Promise<Keypair | null> {
  const db = getServiceClient();
  const { data } = await db
    .from("custodial_wallets")
    .select("encrypted_secret_key, iv")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  const secret = decryptSniperSecretKey(
    { encryptedSecretKey: data.encrypted_secret_key, iv: data.iv },
    userId
  );
  return getSniperKeypairFromSecretKey(secret);
}
