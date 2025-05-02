import type { NextConfig } from 'next';
import type { Rewrite } from 'next/dist/lib/load-custom-routes';

const nextConfig: NextConfig = {

  async rewrites(): Promise<Rewrite[]> {
    // Use the environment variable directly for the destination
    // Fallback to localhost:8000 only if the env var is not set
    const apiDestination = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`;

    // Log API destination configuration for better debugging
    console.log(`[next.config.ts] Rewriting /api/:path* to ${apiDestination}`);
    
    if (!process.env.NEXT_PUBLIC_API_URL) {
      console.warn('[next.config.ts] Warning: NEXT_PUBLIC_API_URL is not set, using default localhost:8000');
    }

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
  
  // Experimental features configuration
  experimental: {
    // Add a faster timeout for API requests
    serverActions: {
      bodySizeLimit: '2mb',
    },
    // Configure performance tracking
    webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'FID', 'INP'],
  },
};

export default nextConfig;
