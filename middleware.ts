import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/', '/terms', '/privacy'];

// Paths accessible to everyone, regardless of auth
const ALWAYS_PUBLIC = ['/terms', '/privacy'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasToken = req.cookies.has('pos-token');

  // Always-public pages: no redirect
  if (ALWAYS_PUBLIC.includes(pathname)) {
    return NextResponse.next();
  }

  // Logged-in user on auth/landing pages → redirect to /today
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
