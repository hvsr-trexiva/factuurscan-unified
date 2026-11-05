import type { NextConfig } from 'next';

const config: NextConfig = {
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'no-referrer' },
      ],
    }];
  },
};

export default config;
