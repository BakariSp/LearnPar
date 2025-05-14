import { Metadata } from 'next';
import { generateMetadata as createMetadata } from '@/utils/seo';

type Props = {
  params: { locale: string };
};

export function generateMetadata({ params }: Props): Metadata {
  const locale = params?.locale || 'en';
  
  return createMetadata({
    title: 'Online Courses',
    description: 'Browse our collection of AI-powered courses designed to enhance your learning experience and help you achieve your goals faster.',
    keywords: [
      'online courses', 
      'AI learning', 
      'personalized education', 
      'skill development',
      'interactive courses'
    ],
    canonical: `/${locale}/courses`,
    locale: locale === 'en' ? 'en_US' : 'zh_CN',
  });
} 