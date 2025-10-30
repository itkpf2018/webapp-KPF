"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrandingLogoSrc } from "@/lib/branding";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { CartesianGrid, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, TrendingDown, Clock, Award, Package, Users, BarChart3 } from "lucide-react";

type EmployeeOption = {
  id: string;
  name: string;
  phone: string | null;
  province: string | null;
  region: string | null;
  defaultStoreId: string | null;
};

type RoiData = {
  employee: {
    id: string;
    name: string;
    region: string | null;
    phone: string | null;
  };
  period: {
    startIso: string;
    endIso: string;
    label: string;
  };
  kpi: {
    totalSales: number;
    totalExpenses: number;
    netProfit: number;
    roi: number;
    roiPercentage: number;
  };
  workEfficiency: {
    totalHours: number;
    workingDays: number;
    avgRevenuePerDay: number;
    avgRevenuePerHour: number;
  };
  expenseBreakdown: Array<{
    label: string;
    amount: number;
    percentage: number;
  }>;
  topProducts: Array<{
    productName: string;
    quantity: number;
    revenue: number;
    estimatedProfit: number;
  }>;
  dailyTrend: Array<{
    date: string;
    sales: number;
    profit: number;
    expenses: number;
  }>;
  expenseRatio: number;
  revenuePerExpense: number;
};

type ReportData = {
  branding: {
    logoPath: string | null;
    updatedAt: string;
  };
  roi: RoiData;
};

type Props = {
  initialEmployees: EmployeeOption[];
};

const FALLBACK_LOGO = "/icons/icon-192x192.png";
const COLOR_PALETTE = {
  primary: "#0f172a",
  secondary: "#64748b",
  accent: "#3b82f6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  muted: "#f1f5f9",
  border: "#e2e8f0",
  chart: ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"],
};

// Shadow styles for 3D depth effect
const SHADOW_STYLES = {
  card: "shadow-[0_2px_8px_0_rgba(0,0,0,0.04),0_1px_2px_0_rgba(0,0,0,0.06)]",
  cardHover: "hover:shadow-[0_4px_16px_0_rgba(0,0,0,0.08),0_2px_4px_0_rgba(0,0,0,0.12)]",
  kpiCard: "shadow-[0_1px_3px_0_rgba(0,0,0,0.08),0_1px_2px_-1px_rgba(0,0,0,0.06)]",
  container: "shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08),0_2px_8px_-2px_rgba(0,0,0,0.12)]",
};

type FiltersState = {
  employeeId: string;
};

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: ReportData }
  | { status: "error"; message: string };

const CURRENCY_FORMATTER = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number) {
  return CURRENCY_FORMATTER.format(value).replace("฿", "฿");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 1 }).format(value);
}

function formatShortThaiDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.valueOf())) {
    return isoDate;
  }
  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
  });
}

export default function RoiReportPageClient({ initialEmployees }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const defaultEmployee = initialEmployees[0] ?? null;

  // Initialize filters from URL or use defaults
  const [filters, setFilters] = useState<FiltersState>(() => {
    const employeeId = searchParams.get("employeeId") || defaultEmployee?.id || "";

    return {
      employeeId,
    };
  });

  const [state, setState] = useState<FetchState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();

    if (filters.employeeId) params.set("employeeId", filters.employeeId);

    router.replace(`?${params.toString()}`, { scroll: false });
  }, [filters, router]);

  useEffect(() => {
    if (!filters.employeeId) {
      setState({ status: "idle" });
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    const params = new URLSearchParams();
    params.set("employeeId", filters.employeeId);

    setState({ status: "loading" });
    void fetch(`/api/admin/reports/roi?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(data?.message ?? "ไม่สามารถโหลดรายงานได้");
        }
        const payload = (await response.json()) as { data: ReportData };
        setState({ status: "success", data: payload.data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : "ไม่สามารถโหลดรายงานได้";
        setState({ status: "error", message });
      });

    return () => {
      controller.abort();
    };
  }, [filters]);

  const handleChange = (key: keyof FiltersState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handlePrint = () => {
    window.print();
  };

  const hasEmployees = initialEmployees.length > 0;
  const toolbarDisabled = state.status === "loading";
  const report = state.status === "success" ? state.data : null;
  const displayLogo =
    getBrandingLogoSrc(
      report?.branding.logoPath ?? null,
      report?.branding.updatedAt ?? null,
      FALLBACK_LOGO,
    ) ?? FALLBACK_LOGO;

  // Supervisor signature should always be blank
  const supervisorSignatureName = "";

  // Calculate additional metrics
  const attendanceQuality = report
    ? (() => {
        const workingDays = report.roi.workEfficiency.workingDays;
        const totalHours = report.roi.workEfficiency.totalHours;
        const avgHoursPerDay = workingDays > 0 ? totalHours / workingDays : 0;

        // Assuming standard 8-hour workday
        const completionRate = avgHoursPerDay > 0 ? Math.min((avgHoursPerDay / 8) * 100, 100) : 0;

        return {
          avgHoursPerDay,
          completionRate,
        };
      })()
    : null;

  // Calculate performance highlights
  const performanceHighlights = report
    ? (() => {
        const dailyTrend = report.roi.dailyTrend;
        const topProducts = report.roi.topProducts;

        // Best sales day
        const bestDay = dailyTrend.length > 0
          ? dailyTrend.reduce((max, day) => (day.sales > max.sales ? day : max), dailyTrend[0])
          : null;

        // Top product
        const topProduct = topProducts.length > 0 ? topProducts[0] : null;

        // Working days ratio
        const totalDaysInPeriod = dailyTrend.length;
        const workingDays = report.roi.workEfficiency.workingDays;
        const workingRatio = totalDaysInPeriod > 0 ? (workingDays / totalDaysInPeriod) * 100 : 0;

        // Average daily revenue
        const avgDailyRevenue = report.roi.workEfficiency.avgRevenuePerDay;

        // Consistency score (based on standard deviation of daily sales)
        let consistencyScore = 0;
        if (dailyTrend.length > 1) {
          const salesValues = dailyTrend.map(d => d.sales);
          const avg = salesValues.reduce((a, b) => a + b, 0) / salesValues.length;
          const variance = salesValues.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / salesValues.length;
          const stdDev = Math.sqrt(variance);
          const cv = avg > 0 ? (stdDev / avg) : 0; // Coefficient of variation
          consistencyScore = Math.max(0, Math.min(10, 10 - (cv * 10))); // Lower CV = higher consistency
        }

        return {
          bestDay,
          topProduct,
          workingRatio,
          avgDailyRevenue,
          consistencyScore,
          totalDaysInPeriod,
        };
      })()
    : null;

  const performanceInsights = report
    ? (() => {
        const roi = report.roi.kpi.roiPercentage;
        const revenuePerExpense = report.roi.revenuePerExpense;

        let roiLevel = "";
        let roiColor = COLOR_PALETTE.secondary;

        if (roi >= 1000) {
          roiLevel = "ยอดเยี่ยม";
          roiColor = "#10b981";
        } else if (roi >= 500) {
          roiLevel = "ดีมาก";
          roiColor = "#3b82f6";
        } else if (roi >= 200) {
          roiLevel = "ดี";
          roiColor = "#8b5cf6";
        } else if (roi >= 0) {
          roiLevel = "พอใช้";
          roiColor = "#f59e0b";
        } else {
          roiLevel = "ต้องปรับปรุง";
          roiColor = "#ef4444";
        }

        return {
          roiLevel,
          roiColor,
          efficiency: revenuePerExpense >= 3 ? "สูง" : revenuePerExpense >= 2 ? "ปานกลาง" : "ต่ำ",
        };
      })()
    : null;

  if (!hasEmployees) {
    return (
      <div className={`space-y-4 bg-white p-8 ${SHADOW_STYLES.card}`}>
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900 -mt-4 mb-2">รายงาน ROI</h1>
          <p className="text-sm text-slate-500">กรุณาเพิ่มรายชื่อพนักงานก่อน เพื่อสร้างรายงาน ROI</p>
        </header>
        <div className={`bg-slate-50 px-5 py-4 text-sm text-slate-600 ${SHADOW_STYLES.kpiCard}`}>
          ยังไม่มีข้อมูลพนักงาน
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-0">
      {/* Toolbar - Hidden on Print */}
      <section className="print:hidden">
        <div className={`bg-white p-6 ${SHADOW_STYLES.card} transition-shadow ${SHADOW_STYLES.cardHover}`}>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="mb-1 text-lg font-semibold text-slate-900 -mt-4">รายงาน ROI</h2>
                <p className="text-sm text-slate-500">วิเคราะห์ผลตอบแทนการลงทุนจากการจ้างพนักงาน</p>
              </div>

              <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-700">เลือกพนักงาน</label>
                  <select
                    className="w-full border border-slate-300 bg-white px-3 py-2 text-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={filters.employeeId}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) => handleChange("employeeId", event.target.value)}
                    disabled={toolbarDisabled}
                  >
                    {initialEmployees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </select>
                </div>
              </form>
            </div>

            <div className="flex flex-col items-end gap-3">
              <button
                type="button"
                onClick={handlePrint}
                disabled={state.status !== "success"}
                className="inline-flex items-center gap-2 bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                พิมพ์ / PDF
              </button>

              {state.status === "loading" && (
                <span className="text-xs text-slate-500">กำลังโหลด...</span>
              )}
              {state.status === "error" && (
                <span className="text-xs text-red-600">{state.message}</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Report Content */}
      {report && (
        <div className="roi-report-container mx-auto print:mx-0">
          <style jsx global>{`
            @media print {
              @page {
                size: A4 portrait;
                margin: 10mm;
              }

              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }

              body {
                margin: 0;
                padding: 0;
                background: white !important;
              }

              .roi-report-container {
                width: 100%;
                max-width: 100%;
              }

              .print-card {
                page-break-inside: avoid;
                break-inside: avoid;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06) !important;
              }

              .print-hide {
                display: none !important;
              }

              .print-text-xs {
                font-size: 10px !important;
                line-height: 1.4 !important;
              }

              .print-text-sm {
                font-size: 11px !important;
                line-height: 1.5 !important;
              }

              .print-text-base {
                font-size: 13px !important;
                line-height: 1.5 !important;
              }

              .print-gap-2 {
                gap: 3mm !important;
              }

              .print-p-3 {
                padding: 3mm !important;
              }

              .print-p-4 {
                padding: 4mm !important;
              }

              /* Header styles */
              header.print-card {
                display: flex !important;
              }

              /* Chart containers */
              .print-chart-container {
                height: 140px !important;
              }

              /* Reduce spacing for A4 fit */
              .roi-report-container .space-y-6 {
                gap: 3mm !important;
              }

              /* Pie chart container for print */
              .print-pie-container {
                height: 140px !important;
              }

              .print-pie-container svg {
                width: 200px !important;
                height: 140px !important;
              }

              /* Signature block styles */
              .signatures {
                margin-top: 30px;
                display: flex;
                flex-direction: column;
                gap: 8px;
              }

              .signature-row {
                display: flex;
                justify-content: space-between;
                align-items: stretch;
                gap: 10px;
                page-break-inside: avoid;
                margin-top: 20px;
              }

              .signature-cell {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                flex: 1 1 0;
                min-width: 0;
                border: 1px solid #333;
                padding: 28px 8px 12px 8px;
                background: #fafafa;
              }

              .signature-inline {
                display: flex;
                align-items: baseline;
                gap: 5px;
                font-size: 9px;
                white-space: nowrap;
              }

              .signature-line {
                display: inline-block;
                border-bottom: 1px solid #333;
                min-width: 90px;
                width: 90px;
              }

              .signature-name {
                font-size: 10px;
                color: #333;
                margin-top: 2px;
                white-space: nowrap;
                text-align: center;
                min-width: 120px;
              }

              .signature-date {
                font-size: 9px;
                color: #666;
                margin-top: 3px;
              }
            }
          `}</style>

          <div className={`space-y-6 bg-gradient-to-br from-white via-white to-slate-50/30 p-8 ${SHADOW_STYLES.container} print:p-4 print:shadow-none print:space-y-3 print:bg-white`}>
            {/* Header Section */}
            <header className="flex items-start justify-between border-b border-slate-200 pb-6 print:pb-3 print:mb-3 print:border-b print:border-slate-300 print-card">
              <div className="flex items-center gap-4">
                <div className={`relative h-14 w-14 overflow-hidden bg-white print:h-10 print:w-10 ${SHADOW_STYLES.kpiCard}`}>
                  <Image
                    src={displayLogo}
                    alt="Logo"
                    fill
                    sizes="56px"
                    className="object-contain p-1"
                    priority
                    unoptimized={displayLogo.startsWith("http")}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 print:text-[9px]">
                    รายงานผลตอบแทนการลงทุน
                  </p>
                  <h1 className="text-xl font-semibold text-slate-900 print:text-sm print:font-bold">
                    {report.roi.employee.name}
                  </h1>
                  <p className="text-sm text-slate-600 print:text-[10px]">
                    {report.roi.employee.region || "-"} · {report.roi.period.label}
                  </p>
                </div>
              </div>

              <div className={`bg-gradient-to-br from-white to-slate-50 px-6 py-4 text-right ${SHADOW_STYLES.card} print:bg-white print:px-3 print:py-2`}>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500 print:text-[9px]">
                  ผลตอบแทน ROI
                </p>
                <div className="flex items-baseline justify-end gap-1">
                  <p className="text-3xl font-bold print:text-lg" style={{ color: performanceInsights?.roiColor }}>
                    {formatNumber(report.roi.kpi.roiPercentage)}%
                  </p>
                </div>
                <p className="text-xs text-slate-500 print:text-[10px]">
                  {performanceInsights?.roiLevel}
                </p>
              </div>
            </header>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-4 gap-4 print:grid-cols-4 print:gap-2">
              {[
                {
                  label: "ยอดขายรวม",
                  value: formatCurrency(report.roi.kpi.totalSales),
                  subtext: `${formatCurrency(report.roi.workEfficiency.avgRevenuePerDay)}/วัน`,
                  icon: TrendingUp,
                  iconColor: COLOR_PALETTE.accent,
                },
                {
                  label: "ค่าใช้จ่ายรวม",
                  value: formatCurrency(report.roi.kpi.totalExpenses),
                  subtext: `${report.roi.expenseRatio.toFixed(1)}% ของยอดขาย`,
                  icon: DollarSign,
                  iconColor: COLOR_PALETTE.warning,
                },
                {
                  label: "กำไรสุทธิ",
                  value: formatCurrency(report.roi.kpi.netProfit),
                  subtext: `${report.roi.revenuePerExpense.toFixed(2)}x ของค่าใช้จ่าย`,
                  icon: TrendingDown,
                  iconColor: report.roi.kpi.netProfit >= 0 ? COLOR_PALETTE.success : COLOR_PALETTE.danger,
                },
                {
                  label: "วันทำงาน",
                  value: report.roi.workEfficiency.workingDays.toString() + " วัน",
                  subtext: `${formatNumber(report.roi.workEfficiency.totalHours)} ชั่วโมง`,
                  icon: Clock,
                  iconColor: COLOR_PALETTE.secondary,
                },
              ].map((kpi, idx) => {
                const IconComponent = kpi.icon;
                return (
                  <div
                    key={idx}
                    className={`bg-gradient-to-br from-white to-slate-50/50 p-4 ${SHADOW_STYLES.kpiCard} transition-all hover:scale-[1.02] hover:shadow-[0_4px_12px_0_rgba(0,0,0,0.08)] print:hover:scale-100 print:p-2 print-card`}
                  >
                    <div className="mb-2 flex items-center justify-between print:mb-1">
                      <IconComponent
                        className="h-5 w-5 print:h-3 print:w-3"
                        style={{ color: kpi.iconColor }}
                        strokeWidth={2}
                      />
                    </div>
                    <p className="text-xs font-medium text-slate-600 print:text-[9px] print:leading-tight">
                      {kpi.label}
                    </p>
                    <p className="mt-1 text-lg font-bold text-slate-900 print:text-xs print:font-semibold print:mt-0.5">
                      {kpi.value}
                    </p>
                    <p className="text-xs text-slate-500 print:text-[8px] print:leading-tight">
                      {kpi.subtext}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Performance Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2 print:gap-2">
              {/* ROI Overview */}
              <div className={`bg-white p-5 ${SHADOW_STYLES.card} print:p-3 print-card`}>
                <h3 className="mb-4 text-sm font-semibold text-slate-900 print:text-xs print:mb-2 print:font-bold">
                  ภาพรวม ROI
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "เปอร์เซ็นต์ ROI", value: `${formatNumber(report.roi.kpi.roiPercentage)}%` },
                    { label: "รายได้ต่อค่าใช้จ่าย", value: `${report.roi.revenuePerExpense.toFixed(2)} เท่า` },
                    { label: "สัดส่วนค่าใช้จ่าย", value: `${report.roi.expenseRatio.toFixed(1)}%` },
                    { label: "อัตรากำไรสุทธิ", value: `${report.roi.kpi.totalSales > 0 ? ((report.roi.kpi.netProfit / report.roi.kpi.totalSales) * 100).toFixed(1) : "0"}%` },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 print:pb-1">
                      <span className="text-xs text-slate-600 print:text-[10px]">{item.label}</span>
                      <span className="text-sm font-semibold text-slate-900 print:text-[10px] print:font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Work Efficiency */}
              <div className={`bg-white p-5 ${SHADOW_STYLES.card} print:p-3 print-card`}>
                <h3 className="mb-4 text-sm font-semibold text-slate-900 print:text-xs print:mb-2 print:font-bold">
                  ประสิทธิภาพการทำงาน
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "วันทำงาน", value: `${report.roi.workEfficiency.workingDays} วัน` },
                    { label: "ชั่วโมงรวม", value: `${formatNumber(report.roi.workEfficiency.totalHours)} ชม.` },
                    { label: "เฉลี่ยชม./วัน", value: attendanceQuality ? `${formatNumber(attendanceQuality.avgHoursPerDay)} ชม.` : "-" },
                    { label: "รายได้/ชม.", value: formatCurrency(report.roi.workEfficiency.avgRevenuePerHour) },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 print:pb-1">
                      <span className="text-xs text-slate-600 print:text-[10px]">{item.label}</span>
                      <span className="text-sm font-semibold text-slate-900 print:text-[10px] print:font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Daily Trend Chart - Full Width */}
            <div className={`bg-white p-5 ${SHADOW_STYLES.card} print:p-3 print-card overflow-hidden`}>
              <h3 className="mb-4 text-sm font-semibold text-slate-900 print:text-xs print:mb-2 print:font-bold">
                แนวโน้มผลการดำเนินงานรายวัน
              </h3>
              <div className="h-40 w-full print:h-28 overflow-hidden">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report.roi.dailyTrend} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value: string) => formatShortThaiDate(value)}
                      tick={{ fontSize: 8, fill: "#64748b" }}
                      stroke="#cbd5e1"
                      height={20}
                    />
                    <YAxis
                      tick={{ fontSize: 8, fill: "#64748b" }}
                      stroke="#cbd5e1"
                      width={40}
                    />
                    <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} dot={false} name="ยอดขาย" />
                    <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={false} name="กำไร" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 flex items-center justify-center gap-4 text-xs print:text-[9px] print:mt-1">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-blue-500 print:h-1.5 print:w-1.5" />
                  <span className="text-slate-600">ยอดขาย</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-green-500 print:h-1.5 print:w-1.5" />
                  <span className="text-slate-600">กำไร</span>
                </div>
              </div>
            </div>

            {/* Product Analysis - Pie Chart + Table */}
            {report.roi.topProducts.length > 0 && (
              <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2 print:gap-2">
                {/* Pie Chart */}
                <div className={`bg-white p-5 ${SHADOW_STYLES.card} print:p-3 print-card`}>
                  <h3 className="mb-4 text-sm font-semibold text-slate-900 print:text-xs print:mb-2 print:font-bold">
                    สัดส่วนรายได้สินค้า
                  </h3>
                  <div className="flex items-center justify-center print-pie-container" style={{ height: '240px' }}>
                    <PieChart width={280} height={240} className="print:!w-[200px] print:!h-[140px]">
                      <Pie
                        data={report.roi.topProducts.slice(0, 5)}
                        cx={140}
                        cy={120}
                        outerRadius={90}
                        innerRadius={0}
                        dataKey="revenue"
                        nameKey="productName"
                        label={false}
                        paddingAngle={2}
                      >
                        {report.roi.topProducts.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLOR_PALETTE.chart[index % COLOR_PALETTE.chart.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </div>
                </div>

                {/* Product Details Table */}
                <div className={`bg-white p-5 ${SHADOW_STYLES.card} print:p-3 print-card`}>
                  <h3 className="mb-4 text-sm font-semibold text-slate-900 print:text-xs print:mb-2 print:font-bold">
                    รายละเอียดสินค้ายอดนิยม Top 5
                  </h3>
                  <div className="space-y-2.5 print:space-y-1">
                    {report.roi.topProducts.slice(0, 5).map((product, index) => {
                      const totalRevenue = report.roi.topProducts.slice(0, 5).reduce((sum, p) => sum + p.revenue, 0);
                      const percentage = totalRevenue > 0 ? (product.revenue / totalRevenue) * 100 : 0;
                      return (
                        <div key={index} className="border-b border-slate-100 pb-2.5 last:border-0 print:pb-1">
                          <div className="flex items-center justify-between mb-1.5 print:mb-0.5">
                            <div className="flex items-center gap-2 flex-1 print:gap-1">
                              <div
                                className="h-2.5 w-2.5 rounded-full flex-shrink-0 print:h-1.5 print:w-1.5"
                                style={{ backgroundColor: COLOR_PALETTE.chart[index % COLOR_PALETTE.chart.length] }}
                              />
                              <span className="text-xs font-semibold text-slate-900 truncate print:text-[9px]">
                                {product.productName}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-blue-600 ml-2 print:text-[9px]">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] pl-4 print:text-[8px] print:pl-3">
                            <div className="text-slate-600">
                              จำนวน: <span className="font-semibold text-slate-900">{product.quantity}</span> ชิ้น
                            </div>
                            <div className="text-slate-600">
                              รายได้: <span className="font-semibold text-slate-900">{formatCurrency(product.revenue)}</span>
                            </div>
                            <div className="text-slate-600">
                              กำไร: <span className="font-semibold text-green-600">{formatCurrency(product.estimatedProfit)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Performance Highlights & Insights Grid */}
            <div className="grid gap-4 md:grid-cols-3 print:grid-cols-3 print:gap-2">
              {/* Performance Highlights */}
              <div className={`bg-white p-5 ${SHADOW_STYLES.card} print:p-3 print-card`}>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 print:text-xs print:mb-2 print:font-bold">
                  <Award className="h-4 w-4 text-amber-500 print:h-3 print:w-3" strokeWidth={2} />
                  <span>จุดเด่น</span>
                </h3>
                <div className="space-y-2 text-xs print:text-[9px] print:space-y-1 print:leading-tight">
                  {performanceHighlights?.bestDay && (
                    <div className="flex items-start justify-between">
                      <span className="text-slate-600">วันที่ขายดีที่สุด:</span>
                      <span className="font-semibold text-right text-slate-900">
                        {formatCurrency(performanceHighlights.bestDay.sales)}
                      </span>
                    </div>
                  )}
                  {performanceHighlights?.topProduct && (
                    <div className="flex items-start justify-between">
                      <span className="text-slate-600">สินค้ายอดนิยม:</span>
                      <span className="font-semibold text-right text-slate-900">
                        {performanceHighlights.topProduct.quantity} ชิ้น
                      </span>
                    </div>
                  )}
                  <div className="flex items-start justify-between">
                    <span className="text-slate-600">อัตราเข้างาน:</span>
                    <span className="font-semibold text-slate-900">
                      {performanceHighlights?.workingRatio.toFixed(0)}%
                    </span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-slate-600">เฉลี่ย/วัน:</span>
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(performanceHighlights?.avgDailyRevenue || 0)}
                    </span>
                  </div>
                  <div className="flex items-start justify-between">
                    <span className="text-slate-600">ความสม่ำเสมอ:</span>
                    <span className="font-semibold text-slate-900 flex items-center gap-1">
                      {performanceHighlights?.consistencyScore.toFixed(1)}/10
                      {performanceHighlights && performanceHighlights.consistencyScore >= 8 && (
                        <Award className="h-3 w-3 text-amber-500 print:h-2 print:w-2" strokeWidth={2} />
                      )}
                    </span>
                  </div>
                </div>
              </div>
              {/* Expense Breakdown */}
              <div className={`bg-white p-5 ${SHADOW_STYLES.card} print:p-3 print-card`}>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 print:text-xs print:mb-2 print:font-bold">
                  <DollarSign className="h-4 w-4 text-orange-500 print:h-3 print:w-3" strokeWidth={2} />
                  <span>ค่าใช้จ่าย</span>
                </h3>
                <div className="space-y-2 print:space-y-1">
                  {report.roi.expenseBreakdown.slice(0, 4).map((expense, idx) => (
                    <div key={idx}>
                      <div className="mb-1 flex items-center justify-between text-xs print:text-[9px] print:mb-0.5">
                        <span className="text-slate-700 truncate">{expense.label}</span>
                        <span className="font-medium text-slate-900 print:font-semibold ml-2">{formatCurrency(expense.amount)}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 print:h-1">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${expense.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategic Insights */}
              <div className={`bg-white p-5 ${SHADOW_STYLES.card} print:p-3 print-card`}>
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 print:text-xs print:mb-2 print:font-bold">
                  <BarChart3 className="h-4 w-4 text-blue-500 print:h-3 print:w-3" strokeWidth={2} />
                  <span>ข้อมูลเชิงลึก</span>
                </h3>
                <div className="space-y-2 text-xs text-slate-700 print:text-[9px] print:space-y-1 print:leading-tight">
                  <div>
                    <p className="mb-1 font-medium text-slate-900 print:mb-0.5">ประสิทธิภาพ:</p>
                    <p className="leading-relaxed print:leading-tight">
                      {report.roi.kpi.roiPercentage > 1000
                        ? "ROI ยอดเยี่ยม >1000% ผลตอบแทนสูงมาก"
                        : report.roi.kpi.roiPercentage > 500
                        ? "ROI ดีมาก 500-1000% ผลงานแข็งแกร่ง"
                        : report.roi.kpi.roiPercentage > 200
                        ? "ROI ดี >200% แข็งแรงแต่ยังมีที่พัฒนา"
                        : report.roi.kpi.roiPercentage >= 0
                        ? "ROI พอใช้ ควรทบทวนโครงสร้างต้นทุน"
                        : "ROI ติดลบ ต้องปรับปรุงด่วน"}
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 font-medium text-slate-900 print:mb-0.5">ประสิทธิผล:</p>
                    <p className="leading-relaxed print:leading-tight">
                      {performanceInsights?.efficiency === "สูง"
                        ? "สูง - สร้างรายได้ 3 เท่าขึ้นไปต่อค่าใช้จ่าย"
                        : performanceInsights?.efficiency === "ปานกลาง"
                        ? "ปานกลาง - สร้างรายได้ 2-3 เท่าต่อค่าใช้จ่าย"
                        : "ต้องปรับปรุงการควบคุมต้นทุน"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Signature Block - Hidden */}
            {/* Removed as per user request - signatures not needed in ROI report */}

            {/* Footer */}
            <footer className="mt-6 border-t border-slate-200 pt-4 text-center print:mt-3 print:pt-2 print:border-t print:border-slate-300">
              <p className="text-xs text-slate-500 print:text-[9px] print:text-slate-600">
                สร้างรายงาน: {new Date().toLocaleDateString("th-TH", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </p>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
