import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasToken = req.cookies.has('pos-token');

  // Logged-in user visiting auth pages → redirect to /today
  if (PUBLIC_PATHS.includes(pathname) && hasToken) {
    return NextResponse.redirect(new URL('/today', req.url));
  }

  // Unauthenticated user visiting protected pages → redirect to /login
  if (!PUBLIC_PATHS.includes(pathname) && !hasToken) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico|.*\\..*).*)'],
};
