import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
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
  '/auth/callback', // Add the Supabase auth callback path
];

export async function middleware(req: NextRequest) {
  // Skip processing for auth callback path - it has special handling with hash fragments
  if (req.nextUrl.pathname.startsWith('/auth/callback')) {
    return NextResponse.next();
  }
  
  // Create a Supabase client configured to use cookies
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Try to get session but don't rely on it for auth decisions
  // This is because auth is primarily handled by the backend Python service
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error("[Middleware Debug] Session Error:", sessionError);
  }
  
  const pathname = req.nextUrl.pathname;
  
  // Add Content Security Policy headers to all responses
  const response = res;
  
  // Set Content Security Policy headers with unsafe-eval allowed
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' *; img-src 'self' data: *;"
  );
  
  // Skip locale redirection if the path appears to have two locales
  // This could indicate a malformed URL from an OAuth redirect (like /en/en/dashboard)
  const hasDoubleLocale = supportedLngs.some(
    locale => pathname.startsWith(`/${locale}/${locale}/`)
  );
  
  if (hasDoubleLocale) {
    const correctPath = pathname.replace(/^\/([a-z]{2})\/\1\//, '/$1/');
    const correctedUrl = new URL(correctPath, req.url);
    
    if (req.nextUrl.search) {
      correctedUrl.search = req.nextUrl.search;
    }
    
    return NextResponse.redirect(correctedUrl);
  }
  
  // Handle auth redirects for protected routes
  const protectedPaths = ['/dashboard', '/profile', '/settings']; 
  const isProtectedPath = protectedPaths.some(path => {
    const pathWithSlash = path.endsWith('/') ? path : `${path}/`;
    const pathWithoutSlash = path.endsWith('/') ? path.slice(0, -1) : path;
    
    return supportedLngs.some(lang => 
      pathname === `/${lang}${path}` || 
      pathname === `/${lang}${pathWithSlash}` ||
      pathname.startsWith(`/${lang}${pathWithoutSlash}/`)
    );
  });

  // Debug output
  console.log("[Middleware Debug] ===== Request Details =====");
  console.log("[Middleware Debug] Full URL:", req.url);
  console.log("[Middleware Debug] Path:", pathname);
  console.log("[Middleware Debug] Protected Path:", isProtectedPath);
  console.log("[Middleware Debug] Is Auth Path:", pathname.includes('/login'));
  console.log("[Middleware Debug] Session exists:", !!session);
  
  // Check for JWT token in the Authorization header or Cookie
  const authHeader = req.headers.get('authorization');
  const hasAuthHeader = !!authHeader && authHeader.startsWith('Bearer ');
  
  // Check for Supabase auth cookie - this indicates the user is authenticated
  const supabaseAuthCookie = req.cookies.has('sb-auth-token') || req.cookies.has('sb-refresh-token');
  
  // Check if the path is auth-related
  const isAuthPath = pathname.includes('/login');
  
  // For protected paths, check for authentication via Supabase session or auth header
  if (isProtectedPath) {
    console.log("[Middleware Debug] ===== Protected Path Check =====");
    console.log("[Middleware Debug] Protected path check - hasSession:", !!session);
    console.log("[Middleware Debug] Protected path check - hasAuthHeader:", hasAuthHeader);
    console.log("[Middleware Debug] Protected path check - hasSupabaseAuthCookie:", supabaseAuthCookie);
    
    // If we have any sign of authentication, allow access
    if (session || hasAuthHeader || supabaseAuthCookie) {
      console.log("[Middleware Debug] Authentication detected, allowing access to protected path");
      return response;
    }
    
    // Check for debug param to bypass auth check
    const debugBypass = req.nextUrl.searchParams.get('debug_auth') === 'bypass';
    
    // In development, allow debug bypass
    if (process.env.NODE_ENV === 'development' && debugBypass) {
      console.log("[Middleware Debug] Development mode: Bypassing auth check with debug_auth parameter");
      return response;
    }
    
    console.log("[Middleware Debug] No authentication detected, redirecting to login");
    const locale = req.cookies.get('NEXT_LOCALE')?.value || fallbackLng;
    const loginUrl = new URL(`/${locale}/login`, req.url);
    return NextResponse.redirect(loginUrl);
  }
  
  // Handle login page access
  if (isAuthPath) {
    console.log("[Middleware Debug] ===== Login Page Access Check =====");
    console.log("[Middleware Debug] Session:", {
      exists: !!session,
      userId: session?.user?.id,
      email: session?.user?.email,
      metadata: {
        app: session?.user?.app_metadata,
        user: session?.user?.user_metadata
      }
    });
    
    // 检查是否是游客账号
    const isGuest = session?.user?.app_metadata?.is_guest || 
                   session?.user?.user_metadata?.is_guest;
    
    console.log("[Middleware Debug] Guest check:", {
      isGuest,
      appMetadata: session?.user?.app_metadata,
      userMetadata: session?.user?.user_metadata
    });
    
    // 如果是游客账号，允许访问登录页面
    if (isGuest) {
      console.log("[Middleware Debug] Guest account detected - allowing access to login page");
      return response;
    }
    
    // 如果是完全认证的用户，重定向到 dashboard
    if (session?.user?.email && session?.user?.user_metadata?.username) {
      console.log("[Middleware Debug] Fully authenticated user detected - redirecting to dashboard");
      const locale = req.cookies.get('NEXT_LOCALE')?.value || fallbackLng;
      const dashboardUrl = new URL(`/${locale}/dashboard`, req.url);
      return NextResponse.redirect(dashboardUrl);
    }
    
    // 其他情况允许访问登录页面
    console.log("[Middleware Debug] Allowing access to login page");
    return response;
  }
  
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
    return response;
  }
  
  // Skip i18n paths
  if (pathname.startsWith('/locales/')) {
    return response;
  }
  
  // Skip Next.js internal paths and auth callback path
  if (pathname.startsWith('/_next/') || 
      pathname.startsWith('/api/')) {
    return response;
  }
  
  // Check if the pathname has any locale
  const pathnameHasLocale = supportedLngs.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return response;

  // Redirect if there is no locale
  const locale = req.cookies.get('NEXT_LOCALE')?.value || fallbackLng;
  
  // e.g. incoming request is /products
  // The new URL is /en/products
  const newUrl = new URL(`/${locale}${pathname.startsWith('/') ? pathname : `/${pathname}`}`, req.url);
  
  if (req.nextUrl.search) {
    newUrl.search = req.nextUrl.search;
  }

  return NextResponse.redirect(newUrl);
}

// Use a more precise matcher to reduce unnecessary middleware executions
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
  ],
}; 