import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const isDemoMode = supabaseUrl.includes('placeholder') || supabaseUrl.includes('your-project');
  const hasDemoCookie = request.cookies.get('demo_session')?.value === 'true';

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });

  let user = null;
  try {
    const authResult = await supabase.auth.getUser();
    user = authResult.data?.user;
  } catch {
    // Handled gracefully below
  }

  const isAuthRoute =
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/callback') ||
    request.nextUrl.pathname.startsWith('/privacy');

  const isProtectedRoute =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/meetings') ||
    request.nextUrl.pathname.startsWith('/tasks') ||
    request.nextUrl.pathname.startsWith('/settings');

  // If in demo mode or has demo cookie, allow access to protected routes
  if (!user && isProtectedRoute && !isDemoMode && !hasDemoCookie) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthRoute && !request.nextUrl.pathname.startsWith('/callback')) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
