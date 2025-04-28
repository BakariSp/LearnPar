import type { NextConfig } from 'next';
import type { Rewrite } from 'next/dist/lib/load-custom-routes';

const nextConfig: NextConfig = {
  async rewrites(): Promise<Rewrite[]> {
    return [
      {
        source: '/api/:path*',
        // Update the destination URL to the provided Azure address
        destination: 'https://zero-ai-d9e8f5hgczgremge.westus-01.azurewebsites.net/api/:path*', // FastAPI backend
      },
    ];
  },
};

export default nextConfig;