"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "รายงานลงเวลา", href: "/admin/reports" },
  { label: "รายงานยอดขาย", href: "/admin/reports/sales" },
  { label: "รายงานยอดขายรายสินค้า", href: "/admin/reports/products" },
  { label: "รายงานสรุปรายบุคคล", href: "/admin/reports/individual" },
  { label: "รายงาน ROI", href: "/admin/reports/roi" },
  { label: "รายงานเปรียบเทียบยอดขาย", href: "/admin/reports/sales-comparison" },
  { label: "รายงานเคลื่อนไหวสต็อก", href: "/admin/reports/stock-movement" },
];

export function ReportTabs() {
  const pathname = usePathname();

  return (
    <div className="sticky top-[88px] z-40 mb-6 flex flex-wrap gap-3 rounded-2xl border border-white/70 bg-white/90 p-3 shadow-[0_8px_30px_-15px_rgba(37,99,235,0.4)] backdrop-blur-xl print:hidden">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "border-blue-500 bg-blue-50 text-blue-700 shadow-[0_8px_20px_-12px_rgba(37,99,235,0.7)]"
                : "border-slate-300 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
