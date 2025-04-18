import type { NextConfig } from 'next';
import type { Rewrite } from 'next/dist/lib/load-custom-routes';

const nextConfig: NextConfig = {
  async rewrites(): Promise<Rewrite[]> {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*', // FastAPI backend
      },
    ];
  },
};

export default nextConfig;
