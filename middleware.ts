import { NextRequest, NextResponse } from 'next/server';
import { fallbackLng, languages } from './i18n/settings'; // Adjust path if your i18n settings are elsewhere

// List of public paths that don't require locale prefixing or auth
const PUBLIC_FILE = /\.(.*)$/; // Match files with extensions (e.g., .jpg, .css)
const PUBLIC_PATHS = [
  '/locales', // Path for loading translation files
  // Add other public paths if needed (e.g., '/robots.txt', '/sitemap.xml')
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // 1. Check if the path is for a public file or explicitly public path
  if (
    PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    PUBLIC_FILE.test(pathname)
  ) {
    return undefined; // Allow the request to proceed as is
  }

  // 2. Check if the pathname already has a supported locale prefix
  const pathnameIsMissingLocale = languages.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  // 3. If it's missing a locale, redirect to the default locale
  if (pathnameIsMissingLocale) {
    const url = request.nextUrl.clone();
    // Prepend the default locale (e.g., 'en')
    url.pathname = `/${fallbackLng}${pathname.startsWith('/') ? '' : '/'}${pathname}`;

    // Perform the redirect
    return NextResponse.redirect(url);
  }

  // 4. If locale exists or it's a public path, continue
  return undefined;
}

// Configure the middleware matcher
export const config = {
  /*
   * Match all request paths except for the ones starting with:
   * - api (API routes)
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   * - assets (assuming you have an assets folder in /public)
   * - locales (translation files) - Added this based on your i18n setup
   * Matcher ensures middleware doesn't run unnecessarily on these paths.
   */
  matcher: [
    '/((?!api|_next/static|_next/image|assets|favicon.ico|locales).*)',
  ],
}; 