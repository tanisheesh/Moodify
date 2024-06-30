import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.mzstatic.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.saavncdn.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.jiosaavn.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.scdn.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '**.spotifycdn.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  devIndicators: false,
};

export default nextConfig;
