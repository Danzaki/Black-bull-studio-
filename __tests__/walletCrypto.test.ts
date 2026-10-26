import { describe, it, expect } from "vitest";
import { generateNewWallet, encryptSecretKey, decryptSecretKey } from "../lib/walletCrypto";

describe("walletCrypto", () => {
  it("yana buɗe key da password daidai", async () => {
    const w = generateNewWallet();
    const enc = await encryptSecretKey(w.secretKeyBs58, "kalmar-sirri-123");
    expect(await decryptSecretKey(enc, "kalmar-sirri-123")).toBe(w.secretKeyBs58);
  });
  it("yana dawo da null idan password ba daidai ba", async () => {
    const w = generateNewWallet();
    const enc = await encryptSecretKey(w.secretKeyBs58, "daidai");
    expect(await decryptSecretKey(enc, "kuskure")).toBeNull();
  });
});
