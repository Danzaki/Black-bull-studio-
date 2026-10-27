import crypto from "crypto";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const HKDF_SALT = Buffer.from("blackbull-wallet-v2");

function readHexKey(name: string): Buffer {
  const hex = process.env[name];
  if (!hex || hex.length !== 64) {
    throw new Error(`${name} must be a 64-character hex string (32 bytes).`);
  }
  return Buffer.from(hex, "hex");
}

function currentVersion(): number {
  const v = Number.parseInt(process.env.WALLET_KEY_VERSION ?? "1", 10);
  return Number.isInteger(v) && v >= 1 ? v : 1;
}

function masterKey(version: number): Buffer {
  return readHexKey(version === 1 ? "WALLET_ENCRYPTION_KEY" : `WALLET_ENCRYPTION_KEY_V${version}`);
}

function userKey(version: number, userId: string): Buffer {
  return Buffer.from(
    crypto.hkdfSync("sha256", masterKey(version), HKDF_SALT, `wallet:${userId}`, 32)
  );
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
  encryptedSecretKey: string; // legacy: base64 | v2: "v2:<version>:<base64>"
  iv: string; // base64
}

// Idan aka ba da userId: sabon tsari (key na mai amfani + AAD + version). In ba haka ba: tsohon tsari.
export function encryptSniperSecretKey(secretKeyBs58: string, userId?: string): EncryptedSniperWallet {
  const iv = crypto.randomBytes(IV_LENGTH);
  if (userId) {
    const version = currentVersion();
    const cipher = crypto.createCipheriv(ALGORITHM, userKey(version, userId), iv);
    cipher.setAAD(Buffer.from(userId, "utf-8"));
    const enc = Buffer.concat([cipher.update(secretKeyBs58, "utf-8"), cipher.final()]);
    const body = Buffer.concat([enc, cipher.getAuthTag()]).toString("base64");
    return { encryptedSecretKey: `v2:${version}:${body}`, iv: iv.toString("base64") };
  }
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey(1), iv);
  const enc = Buffer.concat([cipher.update(secretKeyBs58, "utf-8"), cipher.final()]);
  return {
    encryptedSecretKey: Buffer.concat([enc, cipher.getAuthTag()]).toString("base64"),
    iv: iv.toString("base64"),
  };
}

export function decryptSniperSecretKey(encrypted: EncryptedSniperWallet, userId?: string): string {
  const iv = Buffer.from(encrypted.iv, "base64");
  const stored = encrypted.encryptedSecretKey;

  let key: Buffer;
  let aad: Buffer | null = null;
  let b64 = stored;

  if (stored.startsWith("v2:")) {
    if (!userId) throw new Error("userId is required to decrypt a v2 wallet.");
    const [, ver, ...rest] = stored.split(":");
    const version = Number.parseInt(ver, 10);
    if (!Number.isInteger(version) || version < 1) throw new Error("Invalid key version.");
    key = userKey(version, userId);
    aad = Buffer.from(userId, "utf-8");
    b64 = rest.join(":");
  } else {
    key = masterKey(1);
  }

  const combined = Buffer.from(b64, "base64");
  const authTag = combined.subarray(combined.length - TAG_LENGTH);
  const ciphertext = combined.subarray(0, combined.length - TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  if (aad) decipher.setAAD(aad);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf-8");
}

export function isLegacySniperWallet(encrypted: EncryptedSniperWallet): boolean {
  return !encrypted.encryptedSecretKey.startsWith("v2:");
}

export function getSniperKeypairFromSecretKey(secretKeyBs58: string): Keypair {
  return Keypair.fromSecretKey(bs58.decode(secretKeyBs58));
}
