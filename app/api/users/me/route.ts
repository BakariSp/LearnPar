import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user from Supabase
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting user:', userError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Return the user data
    return NextResponse.json({
      id: user.id,
      email: user.email,
      username: user.user_metadata?.username,
      full_name: user.user_metadata?.full_name,
      profile_picture: user.user_metadata?.avatar_url,
      is_active: true,
      oauth_provider: user.app_metadata?.provider,
      created_at: user.created_at,
      interests: user.user_metadata?.interests || [],
      is_superuser: false,
      is_guest: user.app_metadata?.is_guest || true,
      subscription_type: user.app_metadata?.subscription_type || 'free'
    });
  } catch (error) {
    console.error('Error in /api/users/me:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 