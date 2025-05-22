import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// This route is called by Supabase Auth after an OAuth sign-in
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  console.log('[Auth Callback] Processing Supabase auth callback, code exists:', !!code);
  
  if (code) {
    try {
      // Create a Supabase client configured to use cookies
      const supabase = createRouteHandlerClient({ cookies });
      
      // Exchange the code for a session
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('[Auth Callback] Error exchanging code for session:', error);
      } else {
        console.log('[Auth Callback] Session created successfully, user ID:', data?.session?.user?.id);
      }
    } catch (err) {
      console.error('[Auth Callback] Exception during code exchange:', err);
    }
  }

  // Get current locale from cookies or default to 'en'
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  const locale = cookieLocale || 'en';

  // Use the 'next' query param, fallback to 'dashboard' if not provided
  const redirectTo = requestUrl.searchParams.get('next') || 'dashboard';
  
  // Log the redirect details
  console.log('[Auth Callback] Redirecting to:', `/${locale}/${redirectTo}`, 'with locale:', locale);
  
  // Construct the final URL with the locale
  const destinationUrl = new URL(`/${locale}/${redirectTo}`, requestUrl.origin);
  destinationUrl.searchParams.set('auth_success', 'true');
  
  return NextResponse.redirect(destinationUrl);
} 