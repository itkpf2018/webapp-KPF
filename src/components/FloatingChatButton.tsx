'use client';

/**
 * FloatingChatButton Component
 *
 * Facebook Messenger-style floating chat
 * - Desktop: Expandable chat box (bottom-right like Facebook)
 * - Mobile: Full screen modal
 */

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle, X, Minus } from 'lucide-react';
import { SupportChatModal } from './SupportChatModal';
import { useModal } from '@/contexts/ModalContext';

export function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const pathname = usePathname();
  const { openModal, closeModal } = useModal();

  // Sync modal state with context
  useEffect(() => {
    if (isOpen && !isMinimized) {
      openModal();
    } else {
      closeModal();
    }
  }, [isOpen, isMinimized, openModal, closeModal]);

  // Hide on login page
  if (pathname === '/login') {
    return null;
  }

  return (
    <>
      {/* Desktop: Messenger-style chat box (hidden on mobile) */}
      <div className="fixed bottom-0 right-6 z-50 hidden md:block">
        {isOpen && !isMinimized ? (
          /* Expanded Chat Box */
          <div className="mb-0 w-96 rounded-t-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header Bar */}
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-white" />
                <span className="font-semibold text-white">แจ้งปัญหา/เสนอแนะ</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsMinimized(true)}
                  className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/20"
                  aria-label="ย่อเก็บ"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-white/80 transition hover:bg-white/20"
                  aria-label="ปิด"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            <div className="h-[500px] overflow-y-auto scrollbar-hide">
              <SupportChatModal onClose={() => setIsOpen(false)} isDesktop />
            </div>
          </div>
        ) : isOpen && isMinimized ? (
          /* Minimized Tab */
          <div className="flex items-center gap-2 rounded-t-2xl bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-2.5 text-white shadow-lg">
            <button
              onClick={() => setIsMinimized(false)}
              className="flex flex-1 items-center gap-2 transition hover:opacity-90"
              aria-label="ขยายแชท"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">แจ้งปัญหา/เสนอแนะ</span>
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                setIsMinimized(false);
              }}
              className="rounded-lg p-1 text-white/80 transition hover:bg-white/20"
              aria-label="ปิดแชท"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          /* Closed Button */
          <button
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg transition-all hover:scale-110 hover:shadow-xl"
            aria-label="เปิดแชท"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Mobile: Full screen modal (hidden on desktop) */}
      <div className="fixed bottom-0 right-0 z-50 md:hidden">
        {isOpen ? (
          <SupportChatModal onClose={() => setIsOpen(false)} isDesktop={false} />
        ) : (
          <button
            onClick={() => setIsOpen(true)}
            className="m-6 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg transition-all active:scale-95"
            aria-label="เปิดแชท"
          >
            <MessageCircle className="h-6 w-6" />
          </button>
        )}
      </div>
    </>
  );
}
