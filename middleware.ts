import { NextRequest, NextResponse } from 'next/server';
import { fallbackLng, languages } from './i18n/settings'; // Adjust path if your i18n settings are elsewhere

// List of public paths that don't require locale prefixing or auth
const PUBLIC_FILE = /\.(.*)$/; // Match files with extensions (e.g., .jpg, .css)
const PUBLIC_PATHS = [
  '/locales', // Path for loading translation files
  // Add other public paths if needed (e.g., '/robots.txt', '/sitemap.xml')
];

// Paths that new users should be able to access without being redirected to setup
const ALLOWED_NEW_USER_PATHS = [
  '/setup',
  '/login',
  '/oauth',
  '/terms',
  '/privacy',
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

  // 4. Check if user is a new user who needs to complete the setup process
  // Get the user data from the request cookies
  const isNewUser = request.cookies.get('new_user')?.value === 'true';
  const isSetupComplete = request.cookies.get('setup_complete')?.value === 'true';
  
  // Extract the path without locale for checking against allowed paths
  const localePrefix = languages.find(locale => pathname.startsWith(`/${locale}/`));
  const pathWithoutLocale = localePrefix 
    ? pathname.replace(new RegExp(`^/${localePrefix}`), '') 
    : pathname;

  // If user is new and hasn't completed setup, redirect to setup page
  // But only if they're not already on an allowed path
  if (isNewUser && !isSetupComplete && !ALLOWED_NEW_USER_PATHS.some(path => pathWithoutLocale.startsWith(path))) {
    const url = request.nextUrl.clone();
    url.pathname = `/${localePrefix || fallbackLng}/setup`;
    return NextResponse.redirect(url);
  }

  // 5. If locale exists or it's a public path, continue
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