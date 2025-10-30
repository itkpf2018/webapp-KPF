'use client';

/**
 * Login Page
 * PIN-based authentication for role-based access
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import PINKeypad from '@/components/PINKeypad';
import { Lock } from 'lucide-react';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const handlePinSubmit = async (pin: string) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login(pin);

      if (!result.success) {
        setError(result.error || 'เข้าสู่ระบบไม่สำเร็จ');
      } else {
        // Success - redirect will happen automatically via useEffect
        router.replace('/');
      }
    } catch (err) {
      console.error('[Login] error:', err);
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearError = () => {
    setError(null);
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          <p className="text-sm text-slate-600">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          {/* Logo/Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
              <Lock className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">เข้าสู่ระบบ</h1>
            <p className="mt-2 text-sm text-slate-600">กรุณากรอก PIN เพื่อเข้าใช้งาน</p>
          </div>

          {/* PIN Keypad */}
          <PINKeypad
            minLength={4}
            maxLength={6}
            onSubmit={handlePinSubmit}
            isLoading={isSubmitting}
            error={error}
            onClear={handleClearError}
          />

          {/* Helper Text */}
          <div className="mt-6 space-y-2 rounded-lg bg-blue-50 p-4">
            <p className="text-xs font-semibold text-blue-900">วิธีใช้งาน:</p>
            <ul className="space-y-1 text-xs text-blue-700">
              <li>• กรอก PIN ที่ Admin ได้สร้างไว้ให้คุณ</li>
              <li>• PIN ประกอบด้วยตัวเลข 4-6 หลัก</li>
              <li>• ถ้าลืม PIN กรุณาติดต่อผู้ดูแลระบบ</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-600">
          © 2025 Attendance Tracker. All rights reserved.
        </p>
      </div>
    </div>
  );
}
