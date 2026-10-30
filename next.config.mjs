import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_BUILD: (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7),
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    remotePatterns: [
      { protocol: 'https', hostname: 'zvjjolpxjsiweuzmvwff.supabase.co', pathname: '/storage/v1/object/public/**' },
      { protocol: 'https', hostname: 'ui-avatars.com' },
    ],
  },
  async redirects() {
    return [{ source: '/trade', destination: '/terminal', permanent: true }];
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
