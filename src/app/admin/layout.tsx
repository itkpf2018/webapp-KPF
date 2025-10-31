"use client";

import type { ReactNode } from "react";
import SiteNav from "@/components/SiteNav";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#eef5ff] via-[#e9f1ff] to-[#f8fbff] print:min-h-0 print:overflow-visible print:bg-white print:p-0">
      <div className="pointer-events-none absolute inset-0 print:hidden">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-300/35 blur-[160px]" />
        <div className="absolute bottom-[-220px] right-[-180px] h-[620px] w-[620px] rounded-full bg-indigo-200/45 blur-[180px]" />
        <div className="absolute top-1/3 left-[-180px] h-[460px] w-[460px] rounded-full bg-white/50 blur-[210px]" />
      </div>

      <SiteNav />

      <div className="relative z-10 pt-[130px] sm:px-4 sm:pb-10 sm:px-6 lg:px-10 print:p-0 print:pt-0">
        <div className="mx-auto w-full max-w-none sm:max-w-[1600px] print:max-w-none">
          <main className="relative overflow-hidden bg-white/85 sm:rounded-3xl sm:border sm:border-white/70 sm:p-6 sm:shadow-[0_50px_180px_-120px_rgba(37,99,235,0.9)] sm:p-8 backdrop-blur-xl print:overflow-visible print:border-none print:shadow-none print:bg-white print:backdrop-blur-none print:p-0 print:m-0">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
