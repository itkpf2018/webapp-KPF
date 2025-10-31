'use client';

/**
 * PWA Update Popup Component
 * Minimal professional update notification
 */

import { useEffect, useState } from 'react';
import { serviceWorkerManager } from '@/lib/serviceWorkerManager';
import { RefreshCw } from 'lucide-react';

type ReleaseNotes = {
  th: {
    title: string;
  };
};

export function UpdatePopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [version, setVersion] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Initialize service worker and listen for updates
    const handleUpdate = (newVersion: string) => {
      setVersion(newVersion);
      setIsVisible(true);
    };

    serviceWorkerManager.initialize(handleUpdate);

    return () => {
      serviceWorkerManager.cleanup();
    };
  }, []);

  const handleUpdate = () => {
    setIsUpdating(true);

    // Add slight delay for better UX
    setTimeout(() => {
      serviceWorkerManager.applyUpdate();
    }, 500);
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleDismiss}
      />

      {/* Popup Container */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-sm bg-white rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-slate-200 overflow-hidden pointer-events-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4 text-center border-b border-slate-100">
            <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
              <RefreshCw className="h-6 w-6 text-white" />
            </div>

            <h2 className="text-lg font-bold text-slate-900 mb-1">
              มีเวอร์ชันใหม่พร้อมใช้งาน
            </h2>

            <p className="text-sm text-slate-600">
              Version {version}
            </p>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <p className="text-sm text-slate-600 text-center leading-relaxed">
              อัปเดตเพื่อใช้ฟีเจอร์ใหม่และปรับปรุงประสิทธิภาพของแอปพลิเคชัน
            </p>
          </div>

          {/* Footer Actions */}
          <div className="px-6 pb-6">
            <div className="flex gap-3">
              <button
                onClick={handleDismiss}
                className="flex-1 px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 active:scale-95 transition-all"
              >
                ภายหลัง
              </button>

              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังอัปเดต...</span>
                  </>
                ) : (
                  <span>อัปเดตเลย</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
