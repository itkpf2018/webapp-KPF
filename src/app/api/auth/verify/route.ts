import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import type { VerifySessionResponse, AuthUser } from '@/types/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();

    // Check if session exists
    const sessionCookie = cookieStore.get('auth-session');
    const userCookie = cookieStore.get('auth-user');

    if (!sessionCookie || !userCookie) {
      return NextResponse.json<VerifySessionResponse>({
        authenticated: false,
      });
    }

    // Parse user data
    const user: AuthUser = JSON.parse(userCookie.value);

    // Validate user data structure
    if (!user.employeeId || !user.role) {
      // Invalid session, clear cookies
      cookieStore.delete('auth-session');
      cookieStore.delete('auth-user');

      return NextResponse.json<VerifySessionResponse>({
        authenticated: false,
      });
    }

    return NextResponse.json<VerifySessionResponse>({
      authenticated: true,
      user,
    });
  } catch (error) {
    console.error('[verify] error:', error);

    // Clear invalid cookies
    const cookieStore = await cookies();
    cookieStore.delete('auth-session');
    cookieStore.delete('auth-user');

    return NextResponse.json<VerifySessionResponse>({
      authenticated: false,
    });
  }
}
