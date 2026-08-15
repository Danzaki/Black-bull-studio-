import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (
    (pathname.startsWith('/dashboard') ||
      pathname.startsWith('/community') ||
      pathname.startsWith('/profile') ||
      pathname.startsWith('/create-post') ||
      pathname.startsWith('/studio') ||
      pathname.startsWith('/messages') ||
      pathname.startsWith('/notifications')) &&
    !user
  ) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = '/auth/sign-in';
    return NextResponse.redirect(signInUrl);
  }

  if (
    (pathname.startsWith('/auth/sign-in') ||
      pathname.startsWith('/auth/sign-up')) &&
    user
  ) {
    const communityUrl = request.nextUrl.clone();
    communityUrl.pathname = '/community';
    return NextResponse.redirect(communityUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/community/:path*',
    '/profile/:path*',
    '/create-post/:path*',
    '/studio/:path*',
    '/messages/:path*',
    '/notifications/:path*',
    '/auth/sign-in',
    '/auth/sign-up',
  ],
};
