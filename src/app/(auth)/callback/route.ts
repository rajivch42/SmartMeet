import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data?.session) {
      const user = data.session.user;
      const providerToken = data.session.provider_token;
      const providerRefreshToken = data.session.provider_refresh_token;

      // If Google OAuth returned provider tokens for Google Calendar, persist them
      if (providerToken && user) {
        await supabase
          .from('integrations')
          .upsert({
            user_id: user.id,
            provider: 'google_calendar',
            access_token: providerToken,
            refresh_token: providerRefreshToken || null,
            is_active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,provider' });
      }

      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  // Return to login with error if exchange failed
  return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin));
}
