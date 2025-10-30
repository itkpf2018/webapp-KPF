"use client";

import { useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { ShelfPhotosGallery } from "./ShelfPhotosGallery";
import { StockUsageTable } from "./StockUsageTable";
import { ActivityText } from "./ActivityText";
import { PromoPhotosSection } from "./PromoPhotosSection";

type PCDailyReport = {
  id: string;
  report_date: string;
  employee_id: string;
  employee_name: string;
  store_id: string;
  store_name: string;
  customer_activities: string | null;
  competitor_promo_photos: string[];
  competitor_promo_notes: string | null;
  store_promo_photos: string[];
  store_promo_notes: string | null;
  status: "draft" | "submitted";
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

type PCShelfPhoto = {
  id: string;
  report_id: string;
  photo_url: string;
  storage_path: string;
  caption: string | null;
  uploaded_at: string;
  created_at: string;
};

type PCStockUsage = {
  id: string;
  report_id: string;
  product_id: string;
  product_code: string;
  product_name: string;
  quantities: Record<string, number>;
  total_base_units: number;
  created_at: string;
};

type Props = {
  report: PCDailyReport;
  photos: PCShelfPhoto[];
  stockUsage: PCStockUsage[];
};

export function ReportCard({ report, photos, stockUsage }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleExportPDF = useCallback(async () => {
    setIsExporting(true);
    try {
      const res = await fetch(
        `/api/admin/pc-reports/export?report_id=${report.id}&format=pdf`
      );

      if (!res.ok) {
        throw new Error("Failed to export report");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pc-report-${report.report_date}-${report.employee_name}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Export error:", err);
      alert("เกิดข้อผิดพลาดในการ export PDF");
    } finally {
      setIsExporting(false);
    }
  }, [report]);

  // Format date
  const dateLabel = format(parseISO(report.report_date), "d MMM yy", { locale: th });
  const timeLabel = report.submitted_at
    ? format(parseISO(report.submitted_at), "HH:mm น.", { locale: th })
    : format(parseISO(report.updated_at), "HH:mm น.", { locale: th });

  // Status badge
  const statusBadge =
    report.status === "submitted" ? (
      <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
        ส่งแล้ว
      </span>
    ) : (
      <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
        แบบร่าง
      </span>
    );

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      {/* Card Header */}
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-xl">
              📋
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800">
                  {dateLabel}
                </span>
                <span className="text-sm text-slate-500">|</span>
                <span className="text-sm text-slate-700">{report.employee_name}</span>
                <span className="text-sm text-slate-500">|</span>
                <span className="text-sm text-slate-700">{report.store_name}</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                {statusBadge}
                <span className="text-xs text-slate-500">อัพเดต: {timeLabel}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6">
        <div className="space-y-6">
          {/* 1. Shelf Photos */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <span className="text-lg">📸</span>
              รูปชั้นวาง ({photos.length} รูป)
            </h3>
            <ShelfPhotosGallery photos={photos} />
          </div>

          {/* 2. Stock Usage */}
          {stockUsage.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="text-lg">📦</span>
                สินค้าที่แกะ ({stockUsage.length} รายการ)
              </h3>
              <StockUsageTable stockUsage={stockUsage} />
            </div>
          )}

          {/* 3. Customer Activities */}
          {report.customer_activities && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="text-lg">👥</span>
                กิจกรรมลูกค้า
              </h3>
              <ActivityText text={report.customer_activities} />
            </div>
          )}

          {/* 4. Competitor Promo (only show if expanded or has content) */}
          {isExpanded && (report.competitor_promo_photos.length > 0 || report.competitor_promo_notes) && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="text-lg">🎯</span>
                โปรโมชั่นคู่แข่ง
              </h3>
              <PromoPhotosSection
                photos={report.competitor_promo_photos}
                notes={report.competitor_promo_notes}
              />
            </div>
          )}

          {/* 5. Store Promo (only show if expanded or has content) */}
          {isExpanded && (report.store_promo_photos.length > 0 || report.store_promo_notes) && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <span className="text-lg">🏪</span>
                โปรโมชั่นร้านเรา
              </h3>
              <PromoPhotosSection
                photos={report.store_promo_photos}
                notes={report.store_promo_notes}
              />
            </div>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={toggleExpanded}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 transition hover:text-blue-700"
          >
            {isExpanded ? "ซ่อนรายละเอียด" : "ดูรายละเอียด"}
            <span className="text-lg">{isExpanded ? "▲" : "▼"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportPDF}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                กำลังสร้าง...
              </>
            ) : (
              <>
                📄 Export PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
