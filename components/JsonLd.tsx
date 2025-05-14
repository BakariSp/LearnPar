'use client';

type OrganizationProps = {
  name: string;
  logo?: string;
  url?: string;
  sameAs?: string[];
};

type WebsiteProps = {
  name: string;
  url: string;
  description?: string;
  language?: string;
};

type CourseProps = {
  name: string;
  description: string;
  provider: string;
  url: string;
  image?: string;
};

type BreadcrumbItemProps = {
  name: string;
  item: string;
};

type BreadcrumbListProps = {
  items: BreadcrumbItemProps[];
};

type JsonLdProps = {
  type: 'Organization' | 'Website' | 'Course' | 'BreadcrumbList';
  data: OrganizationProps | WebsiteProps | CourseProps | BreadcrumbListProps;
};

export default function JsonLd({ type, data }: JsonLdProps) {
  let jsonLd: Record<string, any> = {};

  switch (type) {
    case 'Organization':
      const orgData = data as OrganizationProps;
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: orgData.name,
        url: orgData.url,
        logo: orgData.logo,
        sameAs: orgData.sameAs,
      };
      break;
    case 'Website':
      const websiteData = data as WebsiteProps;
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: websiteData.name,
        url: websiteData.url,
        description: websiteData.description,
        inLanguage: websiteData.language || 'en-US',
      };
      break;
    case 'Course':
      const courseData = data as CourseProps;
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'Course',
        name: courseData.name,
        description: courseData.description,
        provider: {
          '@type': 'Organization',
          name: courseData.provider,
        },
        url: courseData.url,
        ...(courseData.image && { image: courseData.image }),
      };
      break;
    case 'BreadcrumbList':
      const breadcrumbData = data as BreadcrumbListProps;
      jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbData.items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.item,
        })),
      };
      break;
    default:
      return null;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
} 