import crypto from "crypto";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const hexKey = process.env.WALLET_ENCRYPTION_KEY;
  if (!hexKey || hexKey.length !== 64) {
    throw new Error("WALLET_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).");
  }
  return Buffer.from(hexKey, "hex");
}

export interface NewSniperWallet {
  publicKey: string;
  secretKeyBs58: string;
}

export function generateSniperWallet(): NewSniperWallet {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    secretKeyBs58: bs58.encode(keypair.secretKey),
  };
}

export interface EncryptedSniperWallet {
  encryptedSecretKey: string; // base64: ciphertext + auth tag appended
  iv: string; // base64
}

// Encrypt a secret key using the server-side WALLET_ENCRYPTION_KEY (no user password needed).
export function encryptSniperSecretKey(secretKeyBs58: string): EncryptedSniperWallet {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(secretKeyBs58, "utf-8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encryptedSecretKey: Buffer.concat([encrypted, authTag]).toString("base64"),
    iv: iv.toString("base64"),
  };
}

// Decrypt a secret key using the server-side WALLET_ENCRYPTION_KEY. Throws if tampered/corrupted.
export function decryptSniperSecretKey(encrypted: EncryptedSniperWallet): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(encrypted.iv, "base64");
  const combined = Buffer.from(encrypted.encryptedSecretKey, "base64");

  const authTag = combined.subarray(combined.length - 16);
  const ciphertext = combined.subarray(0, combined.length - 16);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf-8");
}

export function getSniperKeypairFromSecretKey(secretKeyBs58: string): Keypair {
  const secretKey = bs58.decode(secretKeyBs58);
  return Keypair.fromSecretKey(secretKey);
}
