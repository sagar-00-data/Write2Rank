import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
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

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl;

  // 1. Guard admin routes using the existing ADMIN_PASSWORD session check
  if (pathname.startsWith('/admin') || pathname.startsWith('/admin/api')) {
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

  // 2. Guard user routes using Clerk
  if (isUserRoute(request)) {
    await auth.protect();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:css|js|gif|svg|png|jpg|jpeg|webp|ico)).*)',
    '/(api|trpc)(.*)',
  ],
};
