import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
function getEncryptionKey(): string {
  const key = process.env.WALLET_ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error(
      "WALLET_ENCRYPTION_KEY is not configured or too short. Set a strong random key in .env.local before creating or accessing wallets."
    );
  }
  return key;
}

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
}

export function generateSolanaKeypair() {
  const keypair = Keypair.generate();
  const publicKey = keypair.publicKey.toBase58();
  const secretKeyString = bs58.encode(keypair.secretKey);
  
  return {
    publicKey,
    secretKeyString,
  };
}

export function encryptPrivateKey(privateKey: string): string {
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(getEncryptionKey(), "salt", 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(privateKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  const payload: EncryptedData = {
    ciphertext: encrypted,
    iv: iv.toString("hex"),
    tag,
  };

  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function decryptPrivateKey(encryptedBase64: string): string {
  const payload: EncryptedData = JSON.parse(
    Buffer.from(encryptedBase64, "base64").toString("utf8")
  );
  
  const key = crypto.scryptSync(getEncryptionKey(), "salt", 32);
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, "hex")
  );
  
  decipher.setAuthTag(Buffer.from(payload.tag, "hex"));
  
  let decrypted = decipher.update(payload.ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

export function getKeypairFromSecretKey(secretKeyBs58: string): Keypair {
  const secretKey = bs58.decode(secretKeyBs58);
  return Keypair.fromSecretKey(secretKey);
}
