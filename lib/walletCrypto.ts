"use client";

import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

// Convert between ArrayBuffer and base64 for storage
function bufferToBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Derive an AES-256 key from the user's password using PBKDF2
async function deriveKeyFromPassword(password: string, salt: BufferSource): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 250000,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export interface NewWallet {
  publicKey: string;
  secretKeyBs58: string;
}

// Generate a brand new Solana keypair (runs entirely in the browser)
export function generateNewWallet(): NewWallet {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    secretKeyBs58: bs58.encode(keypair.secretKey),
  };
}

export interface EncryptedWalletData {
  encryptedSecretKey: string; // base64
  salt: string; // base64
  iv: string; // base64
}

// Encrypt a secret key with the user's password. Everything happens in-browser.
export async function encryptSecretKey(
  secretKeyBs58: string,
  password: string
): Promise<EncryptedWalletData> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyFromPassword(password, salt);

  const encoder = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(secretKeyBs58)
  );

  return {
    encryptedSecretKey: bufferToBase64(ciphertext),
    salt: bufferToBase64(salt.buffer as ArrayBuffer),
    iv: bufferToBase64(iv.buffer as ArrayBuffer),
  };
}

// Decrypt a secret key with the user's password. Returns null if the password is wrong.
export async function decryptSecretKey(
  encrypted: EncryptedWalletData,
  password: string
): Promise<string | null> {
  try {
    const salt = new Uint8Array(base64ToBuffer(encrypted.salt));
    const iv = new Uint8Array(base64ToBuffer(encrypted.iv));
    const key = await deriveKeyFromPassword(password, salt);

    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      base64ToBuffer(encrypted.encryptedSecretKey)
    );

    return new TextDecoder().decode(plaintext);
  } catch {
    // Wrong password (AES-GCM auth tag fails) or corrupted data
    return null;
  }
}

export function getKeypairFromSecretKey(secretKeyBs58: string): Keypair {
  const secretKey = bs58.decode(secretKeyBs58);
  return Keypair.fromSecretKey(secretKey);
}
