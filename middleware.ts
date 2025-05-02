import { NextRequest, NextResponse } from 'next/server';
import { fallbackLng, supportedLngs } from './i18n/settings';

// List of static assets that should be excluded from locale prefixing
const STATIC_ASSETS = [
  '/logo.svg',
  '/sidebar_expend.svg',
  '/sidebar_collasp.svg',
  '/explore.svg',
  '/my_path.svg',
  '/calendar.svg',
  '/knowledge_map.svg',
  '/logout-icon.svg',
  '/subscription.svg',
  '/login_google.svg',
  '/learning_path_1.png',
  '/window.svg',
  '/vercel.svg',
  '/next.svg',
  '/globe.svg',
  '/file.svg',
  '/site.webmanifest',
  '/manifest.json',
  '/favicon.ico'
];

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
  
  // Logic to determine if a request is for a static asset
  const isStaticAsset = (path: string) => {
    // Check for file extensions (.svg, .png, .jpg, etc.)
    if (/\.([a-zA-Z0-9]+)$/.test(path)) {
      return true;
    }
    
    // Check for special manifest files that don't have extensions
    if (path === '/manifest.json' || path === '/site.webmanifest') {
      return true;
    }
    
    // Check if the path is directly in the public folder (no intermediary directories)
    // This matches paths like /logo.svg but not /some/nested/path
    if (/^\/[^\/]+$/.test(path) && path !== '/') {
      // Common static asset directories to exclude from locale prefixing
      const staticAssetDirectories = [
        'assets',
        'images',
        'fonts',
        'icons',
        'media',
        'static',
      ];
      
      // Check if this is a known static asset directory
      for (const dir of staticAssetDirectories) {
        if (path.startsWith(`/${dir}/`)) {
          return true;
        }
      }
      
      return true;
    }
    
    return false;
  };
  
  // Skip locale redirection for static assets
  if (isStaticAsset(pathname)) {
    return;
  }
  
  // Skip i18n paths
  if (pathname.startsWith('/locales/')) {
    return;
  }
  
  // Skip Next.js internal paths
  if (pathname.startsWith('/_next/') || pathname.startsWith('/api/')) {
    return;
  }
  
  // Check if the pathname has any locale
  const pathnameHasLocale = supportedLngs.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return;

  // Redirect if there is no locale
  const locale = request.cookies.get('NEXT_LOCALE')?.value || fallbackLng;
  
  // e.g. incoming request is /products
  // The new URL is /en/products
  const newUrl = new URL(`/${locale}${pathname.startsWith('/') ? pathname : `/${pathname}`}`, request.url);
  
  if (request.nextUrl.search) {
    newUrl.search = request.nextUrl.search;
  }

  return NextResponse.redirect(newUrl);
}

// Use a more precise matcher to reduce unnecessary middleware executions
export const config = {
  matcher: [
    // Only run middleware on pages, not on static assets or API routes
    '/((?!api|_next|.*\\..*|locales|favicon.ico|assets|images|fonts|icons|media|static).*)',
  ],
}; 