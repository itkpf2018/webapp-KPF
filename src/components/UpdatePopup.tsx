'use client';

/**
 * PWA Update Popup Component
 * Professional update notification with changelog display
 */

import { useEffect, useState } from 'react';
import { serviceWorkerManager } from '@/lib/serviceWorkerManager';
import { Sparkles, X, ChevronRight, RefreshCw } from 'lucide-react';

type ReleaseHighlight = {
  icon: string;
  title: string;
  description: string;
};

type ReleaseNotes = {
  th: {
    title: string;
    highlights: ReleaseHighlight[];
    technicalChanges: string[];
  };
  en: {
    title: string;
    highlights: ReleaseHighlight[];
    technicalChanges: string[];
  };
};

export function UpdatePopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [version, setVersion] = useState<string>('');
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNotes | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Initialize service worker and listen for updates
    const handleUpdate = (newVersion: string, notes: ReleaseNotes) => {
      setVersion(newVersion);
      setReleaseNotes(notes);
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

  if (!isVisible || !releaseNotes) return null;

  const notes = releaseNotes.th; // Use Thai version

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={handleDismiss}
      />

      {/* Popup Container */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative w-full max-w-lg bg-gradient-to-br from-white via-white to-blue-50/30 rounded-3xl shadow-[0_20px_80px_-15px_rgba(0,0,0,0.3)] border border-white/50 overflow-hidden pointer-events-auto animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>

          {/* Close Button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-600 hover:bg-white hover:text-slate-900 transition-all shadow-sm hover:shadow-md active:scale-95"
            aria-label="ปิด"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="relative px-8 pt-8 pb-6 text-center">
            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 shadow-[0_10px_40px_-10px_rgba(59,130,246,0.6)] animate-in zoom-in duration-500">
              <Sparkles className="h-8 w-8 text-white animate-pulse" />
            </div>

            <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent mb-2">
              {notes.title}
            </h2>

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 border border-blue-200">
              <span className="text-xs font-semibold text-blue-700">Version {version}</span>
            </div>
          </div>

          {/* Content */}
          <div className="relative px-8 pb-6">
            {/* Highlights */}
            <div className="space-y-3 mb-6">
              {notes.highlights.map((highlight, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/60 backdrop-blur-sm border border-slate-200/50 hover:bg-white/80 hover:border-blue-200 transition-all duration-200 group"
                  style={{
                    animationDelay: `${index * 100}ms`,
                  }}
                >
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                    {highlight.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900 mb-0.5">
                      {highlight.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {highlight.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Technical Details Toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all text-xs font-medium text-slate-700 group"
            >
              <span>รายละเอียดทางเทคนิค</span>
              <ChevronRight
                className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-90' : ''}`}
              />
            </button>

            {/* Technical Details */}
            {showDetails && (
              <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 animate-in slide-in-from-top-2 fade-in duration-200">
                <ul className="space-y-1.5 text-xs text-slate-600">
                  {notes.technicalChanges.map((change, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="relative px-8 pb-8 pt-2">
            <div className="flex gap-3">
              <button
                onClick={handleDismiss}
                className="flex-1 px-4 py-3 rounded-full border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:border-slate-400 active:scale-95 transition-all shadow-sm"
              >
                ภายหลัง
              </button>

              <button
                onClick={handleUpdate}
                disabled={isUpdating}
                className="flex-1 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all shadow-[0_6px_20px_0_rgba(59,130,246,0.35)] hover:shadow-[0_8px_28px_0_rgba(59,130,246,0.45)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>กำลังอัปเดต...</span>
                  </>
                ) : (
                  <>
                    <span>อัปเดตเลย</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <p className="mt-3 text-center text-xs text-slate-500">
              การอัปเดตจะใช้เวลาเพียงไม่กี่วินาที
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
