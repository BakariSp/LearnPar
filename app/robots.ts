import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/login/',
        '/oauth/',
        '/setup/',
        '/subscription/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
} 