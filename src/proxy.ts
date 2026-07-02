import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';
import { verifySession } from './lib/session';

// Define paths that require Clerk user authentication (excluding admin routes and login/api routes)
const isUserRoute = createRouteMatcher([
  '/',
  '/evaluations(.*)',
  '/analytics(.*)',
  '/profile(.*)',
  '/settings(.*)',
  '/subscription(.*)',
]);

// Admin route handler — independent of Clerk
async function handleAdminRoute(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith('/admin')) return null;

  // Bypass check for admin login page and login API endpoint
  if (pathname === '/admin' || pathname === '/admin/api/login') {
    const token = request.cookies.get('admin_session')?.value;
    const secret = process.env.ADMIN_PASSWORD || '';

    if (token && secret) {
      const session = await verifySession(token, secret);
      if (session) {
        if (pathname === '/admin') {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        }
      }
    }
    return NextResponse.next();
  }

  // Protect all other admin pages and APIs
  const token = request.cookies.get('admin_session')?.value;
  const secret = process.env.ADMIN_PASSWORD || '';

  let isAuth = false;
  if (token && secret) {
    const session = await verifySession(token, secret);
    if (session) {
      isAuth = true;
    }
  }

  if (!isAuth) {
    if (pathname.startsWith('/admin/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized: Admin session required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export default clerkMiddleware(async (auth, request) => {
  // 1. Handle admin routes first — these do NOT require Clerk
  const adminResponse = await handleAdminRoute(request);
  if (adminResponse) return adminResponse;

  // 2. Guard user routes using Clerk
  if (isUserRoute(request)) {
    try {
      await auth.protect();
    } catch (e) {
      // If Clerk throws (e.g. missing keys, network error), redirect to login
      // instead of crashing the entire site with a 500
      console.warn('[Proxy] Clerk auth.protect() failed:', (e as Error)?.message || e);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:css|js|gif|svg|png|jpg|jpeg|webp|ico)).*)',
    '/(api|trpc)(.*)',
  ],
};
