import { NextResponse } from 'next/server';
import { signSession } from '@/lib/session';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { password } = body;

    const correctPassword = process.env.ADMIN_PASSWORD;

    if (!correctPassword) {
      console.error('❌ ADMIN_PASSWORD is not set in environment variables.');
      return NextResponse.json(
        { error: 'Admin authentication is misconfigured on the server.' },
        { status: 500 }
      );
    }

    if (!password || password !== correctPassword) {
      // Artificial delay to prevent brute-force attacks
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return NextResponse.json(
        { error: 'Invalid password.' },
        { status: 401 }
      );
    }

    // 24 hour expiration
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
    const token = await signSession({ admin: true, expiresAt }, correctPassword);

    const response = NextResponse.json({ success: true });

    // Set secure cookie
    response.cookies.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60, // 24 hours in seconds
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'An internal error occurred.' },
      { status: 500 }
    );
  }
}
