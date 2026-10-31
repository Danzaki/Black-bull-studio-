"use client";

const THEMES = {
  terminal: {
    card: "rounded-2xl border border-bb-border bg-bb-surface",
    title: "text-white",
    body: "text-zinc-400",
    warn: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  },
  community: {
    card: "rounded-2xl border border-stone-900/10 bg-stone-900/[0.05]",
    title: "text-stone-900",
    body: "text-stone-600",
    warn: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  },
} as const;

const SECTIONS: { title: string; body: string }[] = [
  { title: "Trading is risky", body: "Crypto and meme tokens are highly volatile. Any token can lose all of its value, and you can lose everything you put in. Only use money you can afford to lose." },
  { title: "Security scans are not guarantees", body: "Scores and checks (such as mint authority, freeze authority and RugCheck results) come from third parties and are for reference only. A clean result lowers risk but does not remove it." },
  { title: "Your wallet is managed by Black Bull", body: "Your trading wallet and Sniper wallet are custodial. Black Bull stores the encrypted keys and signs transactions on its servers. Anyone who gets into your account can trade and send funds from these wallets, so use a strong login password and keep only what you need for trading in them." },
  { title: "Send limits", body: "Sends are limited per transaction and per 24 hours. You can see your current limits in Wallet Manager. Limits reduce risk but do not remove it." },
  { title: "Exporting your key", body: "You can export your wallet's private key from Wallet Manager after confirming your login password. Anyone who has this key controls the wallet fully, with no limits. Never share it. Accounts that sign in without a password may not be able to export." },
  { title: "Trades are final", body: "Blockchain transactions cannot be reversed. Prices can change between the quote and the trade, and fees apply." },
  { title: "Not financial advice", body: "Nothing in Black Bull Studio is financial, investment or legal advice. Posts from other users are their own opinions, not ours. Do your own research." },
];

export default function DisclaimerContent({ variant }: { variant: "terminal" | "community" }) {
  const t = THEMES[variant];
  return (
    <div className="space-y-4">
      <div className={"rounded-2xl border p-4 text-sm leading-relaxed " + t.warn}>
        Please read this before you trade. By using Black Bull Studio you accept these risks.
      </div>
      {SECTIONS.map((s) => (
        <div key={s.title} className={t.card + " p-4"}>
          <h2 className={"text-[15px] font-semibold " + t.title}>{s.title}</h2>
          <p className={"mt-1.5 text-sm leading-relaxed " + t.body}>{s.body}</p>
        </div>
      ))}
    </div>
  );
}
