import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        pathname: '/photos/**',
      },
    ],
  },
  // Externizar módulos nativos que não podem ser bundled
  serverExternalPackages: ['sqlite3'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('sqlite3');
    }
    return config;
  },
}

export default nextConfig
