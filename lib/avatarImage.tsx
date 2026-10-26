import Image from 'next/image';

const OK = ['.supabase.co', 'ui-avatars.com'];

export default function Avatar({ src, alt, size, className }: { src: string; alt: string; size: number; className?: string }) {
  let optimized = false;
  try {
    const h = new URL(src).hostname;
    optimized = OK.some((d) => h === d.replace(/^\./, '') || h.endsWith(d));
  } catch {}
  return (
    <Image src={src} alt={alt} width={size} height={size} sizes={`${size}px`} unoptimized={!optimized} className={className} />
  );
}
