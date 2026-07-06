import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, NextRequest } from 'next/server';
import { verifySession } from './lib/session';

// Define paths that require Clerk user authentication
// NOTE: '/' is intentionally NOT listed here — the homepage renders a public
// landing page for unauthenticated visitors (including search engine bots)
// and a student dashboard for signed-in users, all handled client-side.
const isUserRoute = createRouteMatcher([
  '/evaluations(.*)',
  '/analytics(.*)',
  '/profile(.*)',
  '/settings(.*)',
]);

// Founder route handler — independent of Clerk
async function handleFounderRoute(request: NextRequest): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl;

  // Handle redirects from old /admin paths to new /founder paths to prevent broken links
  if (pathname.startsWith('/admin')) {
    const newPath = pathname.replace('/admin', '/founder');
    return NextResponse.redirect(new URL(newPath, request.url));
  }

  if (!pathname.startsWith('/founder')) return null;

  // Bypass check for founder login page and login API endpoint
  if (pathname === '/founder' || pathname === '/founder/api/login') {
    const token = request.cookies.get('admin_session')?.value;
    const secret = process.env.ADMIN_PASSWORD || '';

    if (token && secret) {
      const session = await verifySession(token, secret);
      if (session) {
        if (pathname === '/founder') {
          return NextResponse.redirect(new URL('/founder/dashboard', request.url));
        }
      }
    }
    return NextResponse.next();
  }

  // Protect all other founder pages and APIs
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
    if (pathname.startsWith('/founder/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized: Founder session required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return NextResponse.redirect(new URL('/founder', request.url));
  }

  return NextResponse.next();
}

export default clerkMiddleware(async (auth, request) => {
  // 1. Handle founder routes first — these do NOT require Clerk
  const founderResponse = await handleFounderRoute(request);
  if (founderResponse) return founderResponse;

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
    '/((?!_next/static|_next/image|favicon.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:css|js|gif|svg|png|jpg|jpeg|webp|ico)).*)',
    '/(api|trpc)(.*)',
  ],
};
