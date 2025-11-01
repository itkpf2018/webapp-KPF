'use client';

/**
 * SupportChatModal Component
 *
 * Modal for submitting support tickets/feedback
 * Automatically captures user context
 */

import { useState, useEffect } from 'react';
import { X, Send, Bug, Lightbulb, HelpCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type SupportType = 'bug' | 'suggestion' | 'question';

interface SupportChatModalProps {
  onClose: () => void;
  isDesktop?: boolean;
}

export function SupportChatModal({ onClose, isDesktop = false }: SupportChatModalProps) {
  const { user } = useAuth();
  const [type, setType] = useState<SupportType>('bug');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Auto-captured context
  const [context, setContext] = useState({
    url: '',
    userAgent: '',
    timestamp: '',
  });

  useEffect(() => {
    setContext({
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setError('กรุณากรอกข้อความ');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/support/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message: message.trim(),
          user: {
            name: user?.employeeName || 'ไม่ระบุชื่อ',
            id: user?.employeeId || null,
            role: user?.role || 'unknown',
          },
          context,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'เกิดข้อผิดพลาด');
      }

      setSuccess(true);
      setMessage('');

      // Close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('[SupportChat] Error:', err);
      setError(err instanceof Error ? err.message : 'ไม่สามารถส่งข้อความได้');
    } finally {
      setIsSubmitting(false);
    }
  };

  const typeOptions = [
    { value: 'bug', label: 'แจ้งปัญหา', icon: Bug, color: 'text-red-600 bg-red-50 border-red-200' },
    { value: 'suggestion', label: 'เสนอแนะ', icon: Lightbulb, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { value: 'question', label: 'สอบถาม', icon: HelpCircle, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  ] as const;

  // Desktop mode: no overlay, just content
  if (isDesktop) {
    return (
      <div className="bg-white">
        {/* No header needed - already in FloatingChatButton */}

        {/* Success Message */}
        {success && (
          <div className="mx-4 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="font-semibold text-emerald-900">บันทึกข้อความสำเร็จ!</p>
            <p className="text-sm text-emerald-700 mt-1">ทีมงานได้รับข้อความของคุณแล้ว</p>
          </div>
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Type Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                ประเภท
              </label>
              <div className="grid grid-cols-3 gap-2">
                {typeOptions.map(({ value, label, icon: Icon, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setType(value)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 p-2 transition text-xs ${
                      type === value
                        ? color
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="support-message-desktop" className="block text-xs font-semibold text-slate-700 mb-2">
                ข้อความ
              </label>
              <textarea
                id="support-message-desktop"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="อธิบายปัญหาหรือข้อเสนอแนะของคุณ..."
                rows={4}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition scrollbar-hide"
                required
              />
            </div>

            {/* User Info Display */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              <p className="text-xs font-semibold text-slate-600 mb-1.5">📌 ข้อมูลของคุณ:</p>
              <div className="space-y-0.5 text-xs text-slate-600">
                <p>👤 {user?.employeeName || 'ไม่ระบุชื่อ'} {user?.employeeId ? `(${user.employeeId})` : ''}</p>
                <p>🏢 บทบาท: {user?.role === 'admin' ? 'ผู้ดูแลระบบ' : user?.role === 'sales' ? 'พนักงานขาย' : 'พนักงาน'}</p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>กำลังส่ง...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>ส่งข้อความ</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    );
  }

  // Mobile mode: full screen with overlay
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-white shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">💬 แจ้งปัญหา/เสนอแนะ</h2>
            <p className="text-sm text-slate-500 mt-1">ส่งข้อความถึงทีมงาน</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="ปิด"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mx-6 mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="font-semibold text-emerald-900">บันทึกข้อความสำเร็จ!</p>
            <p className="text-sm text-emerald-700 mt-1">ทีมงานได้รับข้อความของคุณแล้ว</p>
          </div>
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                ประเภท
              </label>
              <div className="grid grid-cols-3 gap-2">
                {typeOptions.map(({ value, label, icon: Icon, color }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setType(value)}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition ${
                      type === value
                        ? color
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs font-semibold">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="support-message" className="block text-sm font-semibold text-slate-700 mb-2">
                ข้อความ
              </label>
              <textarea
                id="support-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="อธิบายปัญหาหรือข้อเสนอแนะของคุณ..."
                rows={5}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100 transition"
                required
              />
            </div>

            {/* User Info Display */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-600 mb-2">📌 ข้อมูลของคุณ:</p>
              <div className="space-y-1 text-xs text-slate-600">
                <p>👤 {user?.employeeName || 'ไม่ระบุชื่อ'} {user?.employeeId ? `(${user.employeeId})` : ''}</p>
                <p>🏢 บทบาท: {user?.role === 'admin' ? 'ผู้ดูแลระบบ' : user?.role === 'sales' ? 'พนักงานขาย' : 'พนักงาน'}</p>
                <p>📱 หน้า: {context.url.split('/').pop() || '/'}</p>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !message.trim()}
              className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>กำลังส่ง...</span>
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  <span>ส่งข้อความ</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
