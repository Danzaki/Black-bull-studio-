import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Black Bull Studio',
  description:
    'Black Bull Studio is a premium AI creative studio for building brand-driven campaigns, meme experiences, and community workflows.',
  keywords: ['AI', 'creative studio', 'meme studio', 'brand design', 'Next.js', 'Tailwind CSS', 'Supabase', 'OpenAI'],
  openGraph: {
    title: 'Black Bull Studio',
    description:
      'A premium AI creative studio built for brands that want bold campaigns, intelligent workflows, and high-end design.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
