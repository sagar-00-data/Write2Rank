import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from './lib/session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only guard admin routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/admin/api')) {
    // 1. Bypass check for login page and login API endpoint
    if (pathname === '/admin' || pathname === '/admin/api/login') {
      const token = request.cookies.get('admin_session')?.value;
      const secret = process.env.ADMIN_PASSWORD || '';
      
      if (token && secret) {
        const session = await verifySession(token, secret);
        if (session) {
          // If already authenticated and visiting login page, redirect to dashboard
          if (pathname === '/admin') {
            return NextResponse.redirect(new URL('/admin/dashboard', request.url));
          }
        }
      }
      return NextResponse.next();
    }

    // 2. Protect all other admin pages and APIs
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
      // If it's an API route, return 401 Unauthorized
      if (pathname.startsWith('/admin/api/')) {
        return new NextResponse(
          JSON.stringify({ error: 'Unauthorized: Admin session required' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      // If it's a page route, redirect to the login page
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/admin/api/:path*'],
};
