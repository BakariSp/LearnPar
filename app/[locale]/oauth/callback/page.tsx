import OAuthCallbackClient from './oauth-callback-client';

type PageProps = {
  params: Promise<{
    locale: string;
  }>;
  // searchParams are no longer needed here, handled in client component
};

// Main page component (now a Server Component)
export default async function Page({ params }: PageProps) {
  const resolvedParams = await params;
  const locale = resolvedParams?.locale || 'en';

  return <OAuthCallbackClient locale={locale} />;
} 