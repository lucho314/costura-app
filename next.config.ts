import type { NextConfig } from "next";

const remotePatterns: NonNullable<NextConfig['images']>['remotePatterns'] = []
const publicUrl = process.env.R2_PUBLIC_URL

if (publicUrl) {
  const url = new URL(publicUrl)
  const pathname = url.pathname === '/' ? '/**' : `${url.pathname.replace(/\/$/, '')}/**`

  remotePatterns.push({
    protocol: url.protocol.replace(':', '') as 'http' | 'https',
    hostname: url.hostname,
    pathname,
  })
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;
