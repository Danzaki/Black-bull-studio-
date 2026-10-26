import { describe, it, expect, beforeAll } from "vitest";
import { generateSniperWallet, encryptSniperSecretKey, decryptSniperSecretKey } from "../lib/sniperWalletCrypto";

beforeAll(() => { process.env.WALLET_ENCRYPTION_KEY = "a".repeat(64); });

describe("sniperWalletCrypto", () => {
  it("yana ɓoyewa da buɗewa daidai", () => {
    const w = generateSniperWallet();
    expect(decryptSniperSecretKey(encryptSniperSecretKey(w.secretKeyBs58))).toBe(w.secretKeyBs58);
  });
  it("yana fashewa idan an canza ciphertext", () => {
    const enc = encryptSniperSecretKey("sirri");
    const bad = { ...enc, encryptedSecretKey: Buffer.from("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx").toString("base64") };
    expect(() => decryptSniperSecretKey(bad)).toThrow();
  });
});
