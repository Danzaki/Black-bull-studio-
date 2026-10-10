import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Hanyoyin da ba sa buƙatar login (ƙara nan idan kana so, misali '/post')
const PUBLIC_PREFIXES = ['/auth'];

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
  const isPublic =
    pathname === '/' || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  const isAuthPage =
    pathname.startsWith('/auth/sign-in') || pathname.startsWith('/auth/sign-up');

  if (!isPublic && !user) {
    const signInUrl = request.nextUrl.clone();
    signInUrl.pathname = '/auth/sign-in';
    return NextResponse.redirect(signInUrl);
  }

  if (isAuthPage && user) {
    const communityUrl = request.nextUrl.clone();
    communityUrl.pathname = '/community';
    return NextResponse.redirect(communityUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api/|_next/|favicon.ico|icon|apple-icon|icons/|manifest|brand/|firebase-messaging-sw.js|.*\\..*).*)',
  ],
};
