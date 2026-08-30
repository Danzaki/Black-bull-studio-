import './globals.css';

export const metadata = {
  title: 'Black Bull Terminal',
  description: 'Solana High Speed Trading Terminal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#090A0F] text-slate-100 antialiased">{children}</body>
    </html>
  );
}
