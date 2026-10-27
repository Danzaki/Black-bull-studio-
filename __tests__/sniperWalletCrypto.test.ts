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

describe("sniperWalletCrypto v2", () => {
  it("yana ɓoyewa da buɗewa da userId", () => {
    const enc = encryptSniperSecretKey("sirri", "user-1");
    expect(enc.encryptedSecretKey.startsWith("v2:1:")).toBe(true);
    expect(decryptSniperSecretKey(enc, "user-1")).toBe("sirri");
  });
  it("yana ƙin buɗewa da userId na wani", () => {
    const enc = encryptSniperSecretKey("sirri", "user-1");
    expect(() => decryptSniperSecretKey(enc, "user-2")).toThrow();
  });
  it("yana ƙin v2 ba tare da userId ba", () => {
    const enc = encryptSniperSecretKey("sirri", "user-1");
    expect(() => decryptSniperSecretKey(enc)).toThrow();
  });
  it("tsohon tsari yana aiki har yanzu", () => {
    const enc = encryptSniperSecretKey("tsoho");
    expect(decryptSniperSecretKey(enc, "user-1")).toBe("tsoho");
  });
});
