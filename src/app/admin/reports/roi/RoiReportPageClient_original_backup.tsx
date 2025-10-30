"use client";

import Image from "next/image";
import { getBrandingLogoSrc } from "@/lib/branding";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";

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
const PRODUCT_COLORS = ["#0ea5e9", "#6366f1", "#06b6d4", "#1e40af", "#38bdf8"];

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
  return CURRENCY_FORMATTER.format(value).replace("฿", "฿ ");
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
  const defaultEmployee = initialEmployees[0] ?? null;

  const [filters, setFilters] = useState<FiltersState>(() => ({
    employeeId: defaultEmployee?.id ?? "",
  }));

  const [state, setState] = useState<FetchState>({ status: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const reportContainerRef = useRef<HTMLDivElement | null>(null);

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
  const lastUpdatedLabel =
    report?.branding.updatedAt && !Number.isNaN(new Date(report.branding.updatedAt).valueOf())
      ? new Date(report.branding.updatedAt).toLocaleDateString("th-TH")
      : "-";
  const dailyTrendEntries = report?.roi.dailyTrend ?? [];
  const trendHighlights =
    dailyTrendEntries.length > 0
      ? (() => {
          const maxSalesEntry = dailyTrendEntries.reduce(
            (max, entry) => (entry.sales > max.sales ? entry : max),
            dailyTrendEntries[0],
          );
          const maxProfitEntry = dailyTrendEntries.reduce(
            (max, entry) => (entry.profit > max.profit ? entry : max),
            dailyTrendEntries[0],
          );
          const maxExpenseEntry = dailyTrendEntries.reduce(
            (max, entry) => (entry.expenses > max.expenses ? entry : max),
            dailyTrendEntries[0],
          );
          const totalProfit = dailyTrendEntries.reduce((sum, entry) => sum + entry.profit, 0);
          const avgProfitPerDay = totalProfit / dailyTrendEntries.length;
          return {
            maxSales: {
              value: maxSalesEntry.sales,
              dateLabel: formatShortThaiDate(maxSalesEntry.date),
            },
            maxProfit: {
              value: maxProfitEntry.profit,
              dateLabel: formatShortThaiDate(maxProfitEntry.date),
            },
            maxExpense: {
              value: maxExpenseEntry.expenses,
              dateLabel: formatShortThaiDate(maxExpenseEntry.date),
            },
            avgProfitPerDay,
          };
        })()
      : null;
  const printTopProducts = (report?.roi.topProducts ?? []).slice(0, 5);
  const topProductsTotalRevenue = printTopProducts.reduce((sum, product) => sum + product.revenue, 0);
  const printExpenses = (report?.roi.expenseBreakdown ?? []).slice(0, 4);
  const chartCardColSpanClass = printTopProducts.length > 0 ? "" : " md:col-span-2 print:col-span-2";
  const printCardClass =
    "roi-print-box rounded-3xl border border-black bg-white p-5 shadow-sm flex flex-col gap-3 h-full";
  const printTableClass = "mt-2 w-full text-xs text-slate-600";

  if (!hasEmployees) {
    return (
      <div className="space-y-4 rounded-3xl border border-black bg-sky-50/60 px-6 py-8 text-slate-700 shadow-sm">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">รายงาน ROI</h1>
          <p className="text-sm text-slate-500">กรุณาเพิ่มรายชื่อพนักงานก่อน เพื่อสร้างรายงาน ROI</p>
        </header>
        <div className="rounded-[28px] border border-black bg-white px-5 py-4 text-sm text-slate-600 shadow-inner">
          ยังไม่มีข้อมูลพนักงาน
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-0">
      <header className="space-y-3 print:hidden">
        <h1 className="text-2xl font-semibold text-slate-900">รายงาน ROI (Return on Investment)</h1>
        <p className="text-sm text-slate-500">วิเคราะห์ผลตอบแทนการลงทุนจากการจ้างพนักงาน</p>
      </header>

      <section className="print:hidden rounded-3xl border border-black bg-gradient-to-br from-white via-white to-sky-50/80 p-4 sm:p-6 shadow-[0_30px_120px_-80px_rgba(37,99,235,0.65)]">
        <form className="grid gap-4" onSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">พนักงาน *</label>
            <select
              className="w-full rounded-2xl border border-black bg-white px-3 py-2 text-sm shadow-sm transition focus:border-black focus:outline-none"
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

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handlePrint}
            disabled={state.status !== "success"}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_18px_60px_-35px_rgba(14,116,144,0.85)] transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            พิมพ์ / PDF
          </button>
          {state.status === "loading" && (
            <span className="inline-flex items-center rounded-full border border-black bg-blue-50 px-4 py-2 text-xs font-medium text-blue-600 shadow-inner">
              กำลังโหลดรายงาน...
            </span>
          )}
          {state.status === "error" && (
            <span className="inline-flex items-center rounded-full border border-black bg-red-50 px-4 py-2 text-xs font-medium text-red-600 shadow-inner">
              {state.message}
            </span>
          )}
        </div>
      </section>

      {report && (
        <div
          ref={reportContainerRef}
          className="roi-report-sheet mx-auto max-w-[920px] rounded-[36px] border border-black bg-white shadow-[0_40px_100px_-80px_rgba(30,64,175,0.55)] print:m-0 print:max-w-full print:w-full print:rounded-none print:border-0 print:shadow-none"
        >
          <style jsx global>{`
            @media print {
              @page {
                size: A4 portrait !important;
                margin: 10mm !important;
              }
              body {
                background: #ffffff !important;
              }
              .roi-report-sheet {
                box-shadow: none !important;
                border: 0 !important;
                padding: 0 !important;
              }
              .roi-report-inner {
                gap: 6mm !important;
                padding: 6mm !important;
              }
              .roi-hero {
                background: #ffffff !important;
                color: #0f172a !important;
                padding: 6mm !important;
                gap: 12px !important;
                border-radius: 6px !important;
                border: 0.2mm solid #000000;
              }
              .roi-hero h2 {
                font-size: 20px !important;
              }
              .roi-hero-metric {
                font-size: 26px !important;
              }
              .roi-top-grid {
                gap: 8px !important;
              }
              .roi-card {
                padding: 6mm !important;
                border-radius: 6px !important;
                box-shadow: none !important;
                page-break-inside: avoid;
                break-inside: avoid;
              }
              .roi-card table td {
                padding-top: 4px !important;
                padding-bottom: 4px !important;
              }
              .roi-print-summary {
                font-size: 11px !important;
                padding: 0 !important;
              }
              .roi-print-summary > :not([hidden]) ~ :not([hidden]) {
                margin-top: 4mm !important;
              }
              .print-grid-row {
                gap: 4mm !important;
              }
              .roi-print-box {
                border: 0.2mm solid #000000;
                border-radius: 5px;
                padding: 5mm;
                page-break-inside: avoid;
                break-inside: avoid;
                background: #ffffff;
              }
              .roi-print-box h3 {
                margin: 0 0 3mm;
                font-size: 12px;
                color: #0f172a;
              }
              .roi-print-summary table {
                width: 100%;
                border-collapse: collapse;
              }
              .roi-print-summary table td {
                padding: 3px 0;
              }
              .roi-print-summary table td:first-child {
                color: #64748b;
              }
              .roi-print-summary table td:last-child {
                text-align: right;
                font-weight: 600;
                color: #0f172a;
              }
              .roi-print-chart {
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 40mm;
                width: 100%;
              }
            }
          `}</style>

          <div className="roi-report-inner overflow-hidden rounded-[36px] print:rounded-none">
            <div className="roi-hero relative flex flex-col gap-6 bg-gradient-to-r from-sky-900 via-sky-800 to-blue-600 px-6 pb-8 pt-6 text-white print:text-slate-900 print:px-3 print:pb-3 print:pt-3">
              <div className="flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white/15 ring-1 ring-white/20 backdrop-blur print:bg-transparent print:ring-0">
                    <Image
                      src={displayLogo}
                      alt="Logo"
                      fill
                      sizes="64px"
                      className="object-contain"
                      priority
                      unoptimized={displayLogo.startsWith("http")}
                    />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-sky-100/90 print:text-slate-500">
                      ROI รายบุคคล
                    </p>
                    <h2 className="text-2xl font-semibold leading-tight text-white print:text-slate-900">
                      {report.roi.employee.name}
                    </h2>
                    <p className="text-sm text-sky-100 print:text-slate-600">
                      โซน: {report.roi.employee.region || "-"} · ระยะเวลา: {report.roi.period.label}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-black bg-white/10 px-5 py-3 text-right text-sm print:border-black print:bg-white print:text-slate-700">
                  <p className="text-xs uppercase tracking-[0.24em] text-sky-100/80 print:text-slate-500">ROI %</p>
                  <p className="roi-hero-metric text-3xl font-semibold text-white print:text-slate-900">
                    {report.roi.kpi.roiPercentage.toFixed(1)}%
                  </p>
                  <p className="text-xs text-sky-100/80 print:text-slate-500">
                    รายงานอัปเดต {lastUpdatedLabel}
                  </p>
                </div>
              </div>

              <div className="roi-top-grid grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-3">
                {[
                  { label: "ยอดขายรวม", value: formatCurrency(report.roi.kpi.totalSales) },
                  { label: "ค่าใช้จ่ายรวม", value: formatCurrency(report.roi.kpi.totalExpenses) },
                  { label: "กำไรสุทธิ", value: formatCurrency(report.roi.kpi.netProfit) },
                  { label: "รายได้ต่อค่าใช้จ่าย", value: `${report.roi.revenuePerExpense.toFixed(2)}x` },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl bg-white/15 px-4 py-3 text-sm ring-1 ring-white/15 backdrop-blur print:bg-white print:text-slate-700 print:ring-slate-200"
                  >
                    <p className="text-[11px] uppercase tracking-[0.18em] text-sky-100/80 print:text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-white print:text-slate-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="roi-print-summary mt-5 space-y-6 px-6 pb-6 pt-8 print:mt-2 print:px-4 print:py-4">
              <div className="grid gap-5 md:grid-cols-2 print:grid-cols-2">
                <div className={printCardClass}>
                  <h3 className="text-sm font-semibold text-slate-900">ภาพรวมผลตอบแทน</h3>
                  <table className={printTableClass}>
                    <tbody>
                      <tr>
                        <td>ยอดขายรวม</td>
                        <td className="text-right font-semibold text-slate-900">{formatCurrency(report.roi.kpi.totalSales)}</td>
                      </tr>
                      <tr>
                        <td>ค่าใช้จ่ายรวม</td>
                        <td className="text-right font-semibold text-slate-900">{formatCurrency(report.roi.kpi.totalExpenses)}</td>
                      </tr>
                      <tr>
                        <td>กำไรสุทธิ</td>
                        <td className="text-right font-semibold text-slate-900">{formatCurrency(report.roi.kpi.netProfit)}</td>
                      </tr>
                      <tr>
                        <td>ROI</td>
                        <td className="text-right font-semibold text-slate-900">{report.roi.kpi.roiPercentage.toFixed(1)}%</td>
                      </tr>
                      <tr>
                        <td>รายได้ต่อค่าใช้จ่าย</td>
                        <td className="text-right font-semibold text-slate-900">{report.roi.revenuePerExpense.toFixed(2)}x</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className={printCardClass}>
                  <h3 className="text-sm font-semibold text-slate-900">ประสิทธิภาพการทำงาน</h3>
                  <table className={printTableClass}>
                    <tbody>
                      <tr>
                        <td>ชั่วโมงงานรวม</td>
                        <td className="text-right font-semibold text-slate-900">{report.roi.workEfficiency.totalHours.toLocaleString("th-TH")}</td>
                      </tr>
                      <tr>
                        <td>วันทำงาน</td>
                        <td className="text-right font-semibold text-slate-900">{report.roi.workEfficiency.workingDays.toLocaleString("th-TH")}</td>
                      </tr>
                      <tr>
                        <td>รายได้เฉลี่ย/วัน</td>
                        <td className="text-right font-semibold text-slate-900">{formatCurrency(report.roi.workEfficiency.avgRevenuePerDay)}</td>
                      </tr>
                      <tr>
                        <td>รายได้เฉลี่ย/ชั่วโมง</td>
                        <td className="text-right font-semibold text-slate-900">{formatCurrency(report.roi.workEfficiency.avgRevenuePerHour)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={`grid gap-5 mt-5 ${printTopProducts.length > 0 ? "md:grid-cols-2 print:grid-cols-2" : "md:grid-cols-1 print:grid-cols-1"}`}>
                <div className={`${printCardClass}${chartCardColSpanClass}`}>
                  <h3 className="text-sm font-semibold text-slate-900">กราฟแนวโน้มรายวัน</h3>
                  <div className="roi-print-chart mx-auto h-[180px] md:h-[200px]">
                    <LineChart width={340} height={200} data={report.roi.dailyTrend} margin={{ top: 8, right: 8, bottom: 12, left: 8 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#cbd5f5" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(value: string) => formatShortThaiDate(value)}
                        tick={{ fontSize: 10, fill: "#0f172a" }}
                        tickLine={false}
                        stroke="#94a3b8"
                        minTickGap={16}
                      />
                      <YAxis
                        tickFormatter={(value: number) => formatCurrency(value)}
                        tick={{ fontSize: 10, fill: "#0f172a" }}
                        tickLine={false}
                        stroke="#94a3b8"
                        width={80}
                      />
                      <Line type="monotone" dataKey="sales" stroke="#0ea5e9" strokeWidth={1.5} dot={false} />
                      <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={1.5} dot={false} />
                      <Line type="monotone" dataKey="expenses" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-[#0ea5e9]" aria-hidden />
                      <span>ยอดขาย</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-[#10b981]" aria-hidden />
                      <span>กำไร</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2 w-2 rounded-full bg-[#f59e0b]" aria-hidden />
                      <span>ค่าใช้จ่าย</span>
                    </div>
                  </div>
                  {trendHighlights && (
                    <table className="mt-3 w-full text-xs text-slate-600">
                      <tbody>
                        <tr>
                          <td>ยอดขายสูงสุด</td>
                          <td className="text-right font-semibold text-slate-900">
                            {formatCurrency(trendHighlights.maxSales.value)}
                            <span className="ml-1 text-[10px] text-slate-500">{trendHighlights.maxSales.dateLabel}</span>
                          </td>
                        </tr>
                        <tr>
                          <td>กำไรสูงสุด</td>
                          <td className="text-right font-semibold text-slate-900">
                            {formatCurrency(trendHighlights.maxProfit.value)}
                            <span className="ml-1 text-[10px] text-slate-500">{trendHighlights.maxProfit.dateLabel}</span>
                          </td>
                        </tr>
                        <tr>
                          <td>ค่าใช้จ่ายสูงสุด</td>
                          <td className="text-right font-semibold text-slate-900">
                            {formatCurrency(trendHighlights.maxExpense.value)}
                            <span className="ml-1 text-[10px] text-slate-500">{trendHighlights.maxExpense.dateLabel}</span>
                          </td>
                        </tr>
                        <tr>
                          <td>กำไรเฉลี่ย/วัน</td>
                          <td className="text-right font-semibold text-slate-900">
                            {formatCurrency(trendHighlights.avgProfitPerDay)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>

                {printTopProducts.length > 0 && (
                  <div className={printCardClass}>
                    <h3 className="text-sm font-semibold text-slate-900">สัดส่วนรายได้สินค้า</h3>
                    <div className="roi-print-chart mx-auto h-[180px] md:h-[200px]">
                      <PieChart width={200} height={200}>
                        <Pie
                          data={printTopProducts}
                          cx="50%"
                          cy="50%"
                          outerRadius={60}
                          dataKey="revenue"
                          paddingAngle={2}
                        >
                          {printTopProducts.map((entry, index) => (
                            <Cell key={`print-product-${entry.productName}`} fill={PRODUCT_COLORS[index % PRODUCT_COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </div>
                    <table className={printTableClass}>
                      <tbody>
                        {printTopProducts.map((product, index) => {
                          const share = topProductsTotalRevenue > 0 ? (product.revenue / topProductsTotalRevenue) * 100 : 0;
                          return (
                            <tr key={product.productName}>
                              <td>
                                <span
                                  className="mr-2 inline-block h-2 w-2 rounded-full"
                                  style={{ backgroundColor: PRODUCT_COLORS[index % PRODUCT_COLORS.length] }}
                                  aria-hidden
                                />
                                {product.productName}
                              </td>
                              <td className="text-right font-semibold text-slate-900">
                                {share.toFixed(1)}%
                                <span className="ml-1 text-[10px] text-slate-500">{formatCurrency(product.revenue)}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    <p className="mt-2 text-[11px] text-slate-500">
                      Top 5 สินค้าสร้างรายได้รวม {formatCurrency(topProductsTotalRevenue)}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid gap-5 mt-5 print:grid-cols-2">
                <div className={printCardClass}>
                  <h3 className="text-sm font-semibold text-slate-900">รายละเอียดค่าใช้จ่าย</h3>
                  <table className={printTableClass}>
                    <tbody>
                      {printExpenses.map((item) => (
                        <tr key={item.label}>
                          <td>{item.label}</td>
                          <td className="text-right font-semibold text-slate-900">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className={printCardClass}>
                  <h3 className="text-sm font-semibold text-slate-900">ข้อสังเกตเชิงกลยุทธ์</h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {report.roi.kpi.roiPercentage > 1000
                      ? "ROI สูงเกิน 1000% สะท้อนศักยภาพที่โดดเด่น ค่าใช้จ่าย 1 บาท สร้างรายได้มากกว่า 10 บาทต่อพนักงานคนนี้"
                      : report.roi.kpi.roiPercentage > 500
                      ? "ROI อยู่ในช่วง 500-1000% ถือว่ายอดเยี่ยม แนะนำให้เสริมทรัพยากรเพื่อผลักดันยอดขายต่อเนื่อง"
                      : "ROI ต่ำกว่า 500% แนะนำทบทวนค่าใช้จ่ายหรือพัฒนาศักยภาพ เพื่อยกระดับผลตอบแทนการจ้างงาน"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
