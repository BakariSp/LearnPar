import type { NextConfig } from 'next';
import type { Rewrite } from 'next/dist/lib/load-custom-routes';

const nextConfig: NextConfig = {

  async rewrites(): Promise<Rewrite[]> {
    // Use the environment variable directly for the destination
    // Fallback to localhost:8000 only if the env var is not set
    const apiDestination = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`;

    console.log(`Rewriting /api/:path* to ${apiDestination}`); // Add log for debugging

    return [
      {
        source: '/api/:path*',
        destination: apiDestination,
      },
    ];
  },

  // Add environment variables to be available at build time
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  },
};

export default nextConfig;
