import { MetadataRoute } from 'next';

// Add additional routes as your site grows
const routes = [
  '',
  '/home',
  '/learning-paths',
  '/courses',
  '/dashboard',
  '/knowledge-map',
  '/my-paths',
  '/calendar',
];

// Supported locales
const locales = ['en', 'zh'];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  
  // Generate sitemap entries for all routes and locales
  const sitemapEntries = locales.flatMap(locale => 
    routes.map(route => ({
      url: `${baseUrl}/${locale}${route}`,
      lastModified: new Date(),
      changeFrequency: route === '' ? 'daily' : 'weekly' as 'daily' | 'weekly',
      priority: route === '' ? 1.0 : 0.8,
    }))
  );

  return sitemapEntries;
} 