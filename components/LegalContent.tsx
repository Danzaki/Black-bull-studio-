"use client";

const THEMES = {
  terminal: { card: "rounded-2xl border border-bb-border bg-bb-surface", title: "text-white", body: "text-zinc-400", note: "border-amber-500/20 bg-amber-500/10 text-amber-400" },
  community: { card: "rounded-2xl border border-stone-900/10 bg-stone-900/[0.05]", title: "text-stone-900", body: "text-stone-600", note: "border-amber-500/30 bg-amber-500/10 text-amber-700" },
} as const;

type Section = { title: string; body: string };

const EMAIL = "blackbullstudio.app@gmail.com";

const TERMS: Section[] = [
  { title: "1. Using Black Bull Studio", body: "Black Bull Studio combines a social community, an AI studio and a Solana trading terminal. By creating an account or using the app you agree to these Terms and to the Risk Disclosure." },
  { title: "2. Your account", body: "You are responsible for your account and for keeping your login password private. You must give accurate information. Tell us straight away if you think someone else has access to your account." },
  { title: "3. Wallets", body: "Your trading wallet and Sniper wallet are custodial: Black Bull stores the encrypted keys and signs transactions for you on our servers. Sends and trades are final and cannot be reversed. Send limits apply. You can export your wallet key from Wallet Manager after confirming your login password." },
  { title: "4. Fees", body: "Network fees and swap fees may apply to trades and sends. Fees shown at the time of a trade are the ones that apply." },
  { title: "5. Acceptable use", body: "Do not post scams, impersonate others, spread malware, harass people, break the law, or try to attack or abuse the service, including inflating views, impressions or other counts. We may remove content and restrict accounts that break these rules." },
  { title: "6. Your content", body: "You keep ownership of what you post. You give us permission to store, display and distribute it inside the service so it can work. You are responsible for what you post." },
  { title: "7. No warranty", body: "The service is provided as it is, without promises that it will always be available or error free. Market data and security scores come from third parties and may be wrong or late." },
  { title: "8. Limit of liability", body: "To the extent the law allows, Black Bull Studio is not liable for trading losses, lost profits, or losses caused by third-party services, market movements, or unauthorised access to your account." },
  { title: "9. Ending use", body: "You can stop using the service at any time. We may suspend or close accounts that break these Terms. We may update these Terms, and continued use means you accept the update." },
  { title: "10. Contact", body: "Questions about these Terms: " + EMAIL + "." },
];

const PRIVACY: Section[] = [
  { title: "1. What we collect", body: "Account data (email, username, display name, bio, profile photo); content you create (posts, comments, polls, images and messages); who you follow; your wallet public address and encrypted wallet keys; records of sends, trades and key exports; push notification tokens; and basic usage data such as post views." },
  { title: "2. How we use it", body: "To run your account and the service, show your content to others, execute your trades and sends, protect against fraud and abuse, send notifications you turn on, count views and impressions, and fix errors." },
  { title: "3. Messages", body: "Direct messages are stored on our servers so they can be delivered and shown to you and the person you wrote to." },
  { title: "4. Who we share it with", body: "We use service providers to operate the app, including hosting and database (Vercel and Supabase), push notifications (Firebase), error monitoring (Sentry), and blockchain, price and security data providers (such as Helius, Jupiter and RugCheck). They only receive what they need. Public posts and your public profile are visible to other users. Blockchain transactions are public by nature." },
  { title: "5. Security", body: "Wallet keys are encrypted on our servers. No system is perfectly secure, so use a strong password and keep only what you need in your wallets." },
  { title: "6. Your choices", body: "You can edit your profile, turn notifications on or off, and clear local app data from About. To ask for access to or deletion of your data, email " + EMAIL + "." },
  { title: "7. Children", body: "The service is not meant for people under 18." },
  { title: "8. Changes and contact", body: "We may update this policy and will change the date below when we do. Contact: " + EMAIL + "." },
];

export default function LegalContent({ kind, variant }: { kind: "terms" | "privacy"; variant: "terminal" | "community" }) {
  const t = THEMES[variant];
  const sections = kind === "terms" ? TERMS : PRIVACY;
  return (
    <div className="space-y-4">
      <div className={"rounded-2xl border p-4 text-xs leading-relaxed " + t.note}>
        Last updated: October 2026. This is a general summary of how the service works. It has not been reviewed by a lawyer.
      </div>
      {sections.map((s) => (
        <div key={s.title} className={t.card + " p-4"}>
          <h2 className={"text-[15px] font-semibold " + t.title}>{s.title}</h2>
          <p className={"mt-1.5 text-sm leading-relaxed " + t.body}>{s.body}</p>
        </div>
      ))}
    </div>
  );
}
