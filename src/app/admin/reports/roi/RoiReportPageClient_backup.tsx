"use client";

import Image from "next/image";
import { getBrandingLogoSrc } from "@/lib/branding";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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

type FiltersState = {
  employeeId: string;
};

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: ReportData }
  | { status: "error"; message: string };

const COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

const CURRENCY_FORMATTER = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number) {
  return CURRENCY_FORMATTER.format(value).replace("฿", "฿ ");
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

  if (!hasEmployees) {
    return (
      <div className="space-y-4">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-slate-900">รายงาน ROI</h1>
          <p className="text-sm text-slate-500">กรุณาเพิ่มรายชื่อพนักงานก่อน เพื่อสร้างรายงาน ROI</p>
        </header>
        <div className="rounded-3xl border border-amber-200 bg-amber-50/80 px-5 py-4 text-sm text-amber-700 shadow-inner">
          ยังไม่มีข้อมูลพนักงาน
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-0">
      <header className="space-y-3 print:hidden">
        <h1 className="text-2xl font-semibold text-slate-900">รายงาน ROI (Return on Investment)</h1>
        <p className="text-sm text-slate-500">
          วิเคราะห์ผลตอบแทนการลงทุนจากการจ้างพนักงาน
        </p>
      </header>

      <section className="print:hidden rounded-3xl border border-blue-100 bg-white/90 p-3 sm:p-5 shadow-[0_30px_120px_-110px_rgba(37,99,235,0.8)]">
        <form className="grid gap-4" onSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">พนักงาน *</label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-400 focus:outline-none"
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

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handlePrint}
            disabled={state.status !== "success"}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 via-sky-500 to-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-[0_18px_60px_-35px_rgba(49,46,129,0.8)] transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            พิมพ์ / PDF
          </button>
          {state.status === "loading" && (
            <span className="inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-600 shadow-inner">
              กำลังโหลดรายงาน...
            </span>
          )}
          {state.status === "error" && (
            <span className="inline-flex items-center rounded-full border border-red-100 bg-red-50 px-4 py-2 text-xs font-medium text-red-600 shadow-inner">
              {state.message}
            </span>
          )}
        </div>
      </section>

      {report && (
        <div ref={reportContainerRef} className="mx-auto max-w-4xl bg-white border border-slate-200 rounded-lg shadow-lg p-6 print:border-none print:shadow-none print:rounded-none print:p-0 print:m-0 print:max-w-full print:w-full">
          <style jsx global>{`
            @media print {
              @page {
                size: A4 portrait !important;
                margin: 10mm !important;
              }
            }
          `}</style>
          {/* Header */}
          <div className="flex items-center gap-4 mb-4 pb-3 border-b-2 border-slate-200">
            <div className="relative h-14 w-14 flex-shrink-0">
              <Image
                src={displayLogo}
                alt="Logo"
                fill
                sizes="56px"
                className="object-contain"
                priority
                unoptimized={displayLogo.startsWith("http")}
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{report.roi.employee.name}</h2>
              <p className="text-xs text-slate-600">
                ผู้บริหาร โซน A · โซน: {report.roi.employee.region || "-"} · รายงาน: {report.roi.period.label}
              </p>
            </div>
          </div>

          {/* KPI Row */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
              <div className="text-[10px] text-slate-600 mb-1">ยอดขายรวม</div>
              <div className="text-base font-bold text-slate-900">{formatCurrency(report.roi.kpi.totalSales)}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
              <div className="text-[10px] text-slate-600 mb-1">ค่าใช้จ่ายรวม</div>
              <div className="text-base font-bold text-slate-900">{formatCurrency(report.roi.kpi.totalExpenses)}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
              <div className="text-[10px] text-slate-600 mb-1">กำไรสุทธิ</div>
              <div className="text-base font-bold text-slate-900">{formatCurrency(report.roi.kpi.netProfit)}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
              <div className="text-[10px] text-slate-600 mb-1">ROI การจ้างงาน</div>
              <div className="text-base font-bold text-blue-600">{report.roi.kpi.roiPercentage.toFixed(1)}%</div>
            </div>
          </div>

          {/* Work Efficiency + Expense Breakdown */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="text-xs font-bold text-slate-900 mb-3 pb-2 border-b border-slate-200">ประสิทธิภาพการทำงาน</div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-slate-50 border border-slate-200 rounded p-2">
                  <div className="text-[9px] text-slate-600 mb-0.5">ชั่วโมงทำงาน</div>
                  <div className="text-sm font-bold text-slate-900">{report.roi.workEfficiency.totalHours} <span className="text-xs font-normal">ชม.</span></div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded p-2">
                  <div className="text-[9px] text-slate-600 mb-0.5">จำนวนวันทำงาน</div>
                  <div className="text-sm font-bold text-slate-900">{report.roi.workEfficiency.workingDays} <span className="text-xs font-normal">วัน</span></div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={report.roi.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 8 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 8 }} stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "9px",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={1.5} dot={false} name="ยอดขาย" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="border border-slate-200 rounded-lg p-3">
              <div className="text-xs font-bold text-slate-900 mb-3 pb-2 border-b border-slate-200">รายละเอียดค่าใช้จ่าย</div>
              <table className="w-full text-[9px]">
                <tbody>
                  {report.roi.expenseBreakdown.map((item, index) => (
                    <tr key={index} className="border-b border-slate-100">
                      <td className="py-1.5 text-slate-700">{item.label}</td>
                      <td className="py-1.5 text-right font-semibold text-slate-900">{formatCurrency(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Products + Hiring ROI Analysis */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="text-xs font-bold text-slate-900 mb-3 pb-2 border-b border-slate-200">สินค้ายอดนิยม โซน A</div>
              <div className="grid grid-cols-2 gap-3">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie
                      data={report.roi.topProducts}
                      cx="50%"
                      cy="50%"
                      outerRadius={50}
                      fill="#8884d8"
                      dataKey="revenue"
                      label={false}
                    >
                      {report.roi.topProducts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "6px",
                        fontSize: "9px",
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <table className="w-full text-[9px]">
                  <tbody>
                    {report.roi.topProducts.slice(0, 5).map((product, index) => (
                      <tr key={index} className="border-b border-slate-100">
                        <td className="py-1 text-slate-700">{product.productName}</td>
                        <td className="py-1 text-right font-semibold text-slate-900 whitespace-nowrap">{formatCurrency(product.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg p-3">
              <div className="text-xs font-bold text-slate-900 mb-3 pb-2 border-b border-slate-200">วิเคราะห์ ROI การจ้างงาน</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded p-2">
                  <span className="text-[9px] text-slate-600">ยอดขายรวม</span>
                  <span className="text-xs font-bold text-slate-900">{formatCurrency(report.roi.kpi.totalSales)}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded p-2">
                  <span className="text-[9px] text-slate-600">ค่าใช้จ่ายรวม</span>
                  <span className="text-xs font-bold text-slate-900">{formatCurrency(report.roi.kpi.totalExpenses)}</span>
                </div>
                <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded p-2">
                  <span className="text-[9px] text-slate-600">กำไรสุทธิ</span>
                  <span className="text-xs font-bold text-slate-900">{formatCurrency(report.roi.kpi.netProfit)}</span>
                </div>
                <div className="flex justify-between items-center bg-blue-50 border border-blue-200 rounded p-2">
                  <span className="text-[9px] text-blue-700 font-semibold">ROI</span>
                  <span className="text-sm font-bold text-blue-600">{report.roi.kpi.roiPercentage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trend & Comparison */}
          <div className="border border-slate-200 rounded-lg p-3 mb-4">
            <div className="text-xs font-bold text-slate-900 mb-3 pb-2 border-b border-slate-200">แนวโน้มและการเปรียบเทียบ</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={report.roi.dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 8 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 8 }} stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    fontSize: "9px",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend wrapperStyle={{ fontSize: "9px" }} />
                <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} dot={false} name="ยอดขาย" />
                <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={false} name="กำไร" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={false} name="ค่าใช้จ่าย" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Insight */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-[10px] leading-relaxed text-green-900">
              <strong className="font-bold">ข้อสังเกต:</strong>{" "}
              {report.roi.kpi.roiPercentage > 1000
                ? "ROI สูงเกินกว่า 1000% แสดงว่าการจ้างพนักงานคนนี้ให้ผลตอบแทนที่ดีเยี่ยม พนักงานสร้างมูลค่าเพิ่มอย่างมีนัยสำคัญ โดยค่าใช้จ่าย 1 บาท สร้างรายได้มากกว่า 10 บาท"
                : report.roi.kpi.roiPercentage > 500
                ? "ROI อยู่ระหว่าง 500-1000% ถือว่าเป็นผลตอบแทนที่ดี พนักงานมีประสิทธิภาพสูง และสร้างมูลค่าเพิ่มให้กับองค์กร"
                : "ROI ต่ำกว่า 500% อาจต้องพิจารณาเพิ่มประสิทธิภาพการทำงาน หรือลดค่าใช้จ่ายเพื่อให้ได้ผลตอบแทนที่ดีขึ้น"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
