import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const cookieStore = await cookies();

    // Clear auth cookies
    cookieStore.delete('auth-session');
    cookieStore.delete('auth-user');


    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[logout] error:', error);
    return NextResponse.json(
      { success: false, error: 'เกิดข้อผิดพลาด' },
      { status: 500 }
    );
  }
}
