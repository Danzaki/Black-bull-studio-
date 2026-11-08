import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Redirect from './Redirect';

const EVM_RE = /^0x[a-fA-F0-9]{40}$/;

type Params = { address: string };
type Props = { params: Promise<Params> };

async function getOrigin() {
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return proto + '://' + host;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  if (!EVM_RE.test(address)) return { title: 'Base Safety | Black Bull' };
  const origin = await getOrigin();
  const image = origin + '/api/base-og?address=' + address;
  const title = 'Base token safety check | Black Bull';
  const description = 'See the red flags before you buy. Automated check, not financial advice.';
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: origin + '/base/t/' + address,
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function SharePage({ params }: Props) {
  const { address } = await params;
  if (!EVM_RE.test(address)) redirect('/base');
  const to = '/base?token=' + address;
  return (
    <div className="flex min-h-screen items-center justify-center bg-bx-bg p-6 text-center text-bx-text">
      <Redirect to={to} />
      <a href={to} className="text-sm font-semibold text-bx-accent underline">
        Open Base Safety
      </a>
    </div>
  );
}
