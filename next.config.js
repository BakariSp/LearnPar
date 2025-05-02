/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  webpack: (config, { isServer }) => {
    // Add resolver for rc-util
    config.resolve.alias = {
      ...config.resolve.alias,
      'rc-util/es/Dom/canUseDom': [
        // Try the original CommonJS version first
        'rc-util/lib/Dom/canUseDom',
        // If that fails, use our custom fallback
        path.resolve('./lib/canUseDom.js'),
      ],
    };
    
    return config;
  },
  // Add other existing config options here if any
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/:path*`,
      },
    ];
  },
  
  // Add publicRuntimeConfig to make environment variables available to the client
  publicRuntimeConfig: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  }
};

module.exports = nextConfig; 