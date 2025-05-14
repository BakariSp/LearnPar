import { Metadata } from 'next';

type MetadataOptions = {
  title?: string;
  description?: string;
  keywords?: string[];
  imageUrl?: string;
  imageAlt?: string;
  type?: 'website' | 'article' | 'profile';
  locale?: string;
  canonical?: string;
  noIndex?: boolean;
};

/**
 * Generates metadata for a page with SEO-optimized settings
 * @param options - The metadata options for the page
 * @returns The metadata object
 */
export function generateMetadata(options: MetadataOptions): Metadata {
  const {
    title,
    description = 'Zero AI helps you create a personalized learning journey with AI-powered recommendations and interactive learning paths.',
    keywords = [],
    imageUrl = '/og-image.jpg',
    imageAlt = 'Zero AI Platform Preview',
    type = 'website',
    locale = 'en_US',
    canonical,
    noIndex = false,
  } = options;

  const seoTitle = title ? `${title} | Zero AI` : 'Zero AI - Your Personalized Learning Journey';
  
  // Base SEO keywords + custom keywords
  const seoKeywords = [
    'artificial intelligence',
    'learning platform',
    'personalized learning',
    'AI education',
    'online courses',
    ...keywords,
  ];

  return {
    title: seoTitle,
    description,
    keywords: seoKeywords,
    robots: noIndex ? 
      { index: false, follow: false } :
      { index: true, follow: true },
    openGraph: {
      title: seoTitle,
      description,
      type,
      locale,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: imageAlt,
        }
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seoTitle,
      description,
      images: [imageUrl],
    },
    alternates: canonical ? {
      canonical,
    } : undefined,
  };
} 