import { NextRequest, NextResponse } from 'next/server';

const protectedRoutes = ['/profile'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (protectedRoutes.some((path) => pathname.startsWith(path))) {
    const token = request.cookies.get('sb-access-token')?.value;

    if (!token) {
      const signInUrl = request.nextUrl.clone();
      signInUrl.pathname = '/auth/sign-in';
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/profile'],
};
