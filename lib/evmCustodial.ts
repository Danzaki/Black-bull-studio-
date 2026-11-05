import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { getServiceClient } from "@/lib/custodialWallet";
import { decryptSniperSecretKey, encryptSniperSecretKey } from "@/lib/sniperWalletCrypto";

const TABLE = "custodial_evm_wallets";

export async function getEvmAddress(userId: string): Promise<string | null> {
  const { data, error } = await getServiceClient()
    .from(TABLE)
    .select("address")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`db select: ${error.code ?? ""} ${error.message}`);
  return data?.address ?? null;
}

// Creates the wallet once per user. One address works on BNB Chain and Base.
export async function ensureEvmWallet(userId: string): Promise<string> {
  const existing = await getEvmAddress(userId);
  if (existing) return existing;

  const pk = generatePrivateKey();
  const account = privateKeyToAccount(pk);
  const enc = encryptSniperSecretKey(pk, userId);

  const { error } = await getServiceClient()
    .from(TABLE)
    .upsert(
      {
        user_id: userId,
        address: account.address,
        encrypted_private_key: enc.encryptedSecretKey,
        iv: enc.iv,
      },
      { onConflict: "user_id", ignoreDuplicates: true }
    );
  if (error) throw new Error(`db upsert: ${error.code ?? ""} ${error.message}`);

  const addr = await getEvmAddress(userId);
  if (!addr) throw new Error("Could not create wallet.");
  return addr;
}

// SERVER ONLY. Never return the account or the key to a client.
export async function loadEvmAccount(userId: string) {
  const { data, error } = await getServiceClient()
    .from(TABLE)
    .select("encrypted_private_key, iv")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`db select: ${error.code ?? ""} ${error.message}`);
  if (!data) return null;
  const pk = decryptSniperSecretKey(
    { encryptedSecretKey: data.encrypted_private_key, iv: data.iv },
    userId
  );
  return privateKeyToAccount(pk as `0x${string}`);
}
