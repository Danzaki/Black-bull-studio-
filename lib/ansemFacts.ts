// Official mint. Leave null until confirmed from Ansem's or the project's official channels.
export const ANSEM_MINT: string | null = null;

export const ANSEM_FACTS = `
- $ANSEM ("The Black Bull") is a Solana memecoin reported to have launched on Pump.fun in mid-June 2026.
- Reports say about 5% of supply was set aside as a community allocation based on on-chain Solana activity.
- Many copycat tokens use the Ansem name. Ansem has reportedly disavowed several of them.
- These facts come from third-party reports and are not confirmed as official.
`;

export const PRESETS: Record<string, { q: string; a: string }> = {
  what: {
    q: "What is $ANSEM?",
    a: "$ANSEM, branded The Black Bull, is a Solana memecoin reported to have launched on Pump.fun in mid-June 2026. It has no confirmed product or roadmap and relies on community attention. Many copycat tokens use the same name. This is general information, not financial advice, and memecoins can lose all their value.",
  },
  verify: {
    q: "How do I verify the official contract?",
    a: "Copycats are common, so never trust an address from a DM, reply or unknown account. Get the mint address only from Ansem's official X account or the project's official pinned posts, and compare it character by character. Be careful with any token that asks you to connect a wallet to claim something. This app's official address is still being confirmed.",
  },
  allocation: {
    q: "How does the community allocation work?",
    a: "Reports say about 5% of supply was set aside for the community, based on on-chain Solana activity. This app has not confirmed the details, so check official announcements before acting. Never share your seed phrase or private key to claim anything.",
  },
};
