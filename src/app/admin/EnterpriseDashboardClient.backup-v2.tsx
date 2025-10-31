"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import type { DashboardMetrics } from "@/lib/configStore";

type DashboardSnapshot = {
  totals: {
    employees: number;
    stores: number;
    products: number;
    logs: number;
  };
  kpis: {
    period: {
      currentStart: string;
      currentEnd: string;
      previousStart: string;
      previousEnd: string;
    };
    alerts: string[];
    attendance: {
      value: number;
      previous: number;
      deltaPercent: number;
    };
    sales: {
      value: number;
      previous: number;
      deltaPercent: number;
    };
    averageTicket: {
      value: number;
      previous: number;
      deltaPercent: number;
    };
    salesTransactions: {
      value: number;
      previous: number;
      deltaPercent: number;
    };
  };
  performance: {
    timeline: Array<{
      dateKey: string;
      label: string;
      salesTotal: number;
      salesAverage: number;
      salesQuantity: number;
      checkIns: number;
      checkOuts: number;
      iso: string;
    }>;
    weekly: Array<{
      label: string;
      startIso: string;
      endIso: string;
      salesTotal: number;
      salesQuantity: number;
      checkIns: number;
    }>;
    segments: {
      store: Array<{
        id: string;
        label: string;
        salesTotal: number;
        salesCount: number;
        salesQuantity: number;
        checkIns: number;
        checkOuts: number;
        activeEmployees: number;
      }>;
      employee: Array<{
        id: string;
        label: string;
        checkIns: number;
        checkOuts: number;
        stores: string[];
      }>;
    };
    metadata: {
      lookbackDays: number;
      timeZone: string;
      generatedAt: string;
    };
  };
  attendance: {
    totalCheckIns: number;
    activeEmployees: number;
  };
  sales: {
    dailyTrend: Array<{
      total: number;
      quantity: number;
      display: string;
    }>;
    topProducts: Array<{
      name: string;
      total: number;
      quantity: number;
    }>;
    totalRevenue: number;
    totalQuantity: number;
  };
  updatedAt: string;
};

type SimplifiedEmployee = {
  id: string;
  name: string;
  province: string | null;
};

type SimplifiedStore = {
  id: string;
  name: string;
  province: string | null;
};

type DashboardFiltersState = {
  rangeMode: DashboardMetrics["filters"]["rangeMode"];
  rangeValue: string;
  store: string;
  employee: string;
  attendanceStatus: DashboardMetrics["filters"]["attendanceStatus"];
  salesStatus: string;
  timeFrom: string;
  timeTo: string;
};

type EnterpriseDashboardClientProps = {
  snapshot: DashboardSnapshot;
  initialMetrics: DashboardMetrics;
  employees: SimplifiedEmployee[];
  stores: SimplifiedStore[];
};

const currencyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("th-TH");

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
});

function padNumber(value: number) {
  return value.toString().padStart(2, "0");
}

function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const lookup = new Map(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number.parseInt(lookup.get("year") ?? "0", 10),
    month: Number.parseInt(lookup.get("month") ?? "0", 10),
    day: Number.parseInt(lookup.get("day") ?? "0", 10),
  };
}

function getCurrentWeekStart(parts: { year: number; month: number; day: number }) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const dayOfWeek = date.getUTCDay();
  const diff = (dayOfWeek + 6) % 7; // convert Sunday-based index to Monday start
  date.setUTCDate(date.getUTCDate() - diff);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function getDefaultRangeValue(
  mode: DashboardFiltersState["rangeMode"],
  timeZone: string,
) {
  const nowParts = getZonedParts(new Date(), timeZone);
  if (mode === "year") {
    return `${nowParts.year}`;
  }
  if (mode === "month") {
    return `${nowParts.year}-${padNumber(nowParts.month)}`;
  }
  if (mode === "week") {
    const weekStart = getCurrentWeekStart(nowParts);
    return `${weekStart.year}-${padNumber(weekStart.month)}-${padNumber(weekStart.day)}`;
  }
  return `${nowParts.year}-${padNumber(nowParts.month)}-${padNumber(nowParts.day)}`;
}

function formatDelta(delta: number) {
  if (!Number.isFinite(delta) || delta === 0) {
    return {
      label: "0%",
      tone: "neutral" as const,
    };
  }
  const tone = delta > 0 ? "up" : "down";
  return {
    label: `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%`,
    tone,
  };
}

function buildTimelineDataset(metrics: DashboardMetrics) {
  const attendanceMap = new Map(
    metrics.attendance.timeline.map((entry) => [entry.dateKey, entry]),
  );
  const salesMap = new Map(metrics.sales.timeline.map((entry) => [entry.dateKey, entry]));
  const keys = Array.from(new Set([...attendanceMap.keys(), ...salesMap.keys()]));
  keys.sort();
  return keys.map((key) => {
    const attendanceEntry = attendanceMap.get(key);
    const salesEntry = salesMap.get(key);
    return {
      key,
      label: salesEntry?.label ?? attendanceEntry?.label ?? key,
      checkIns: attendanceEntry?.checkIns ?? 0,
      checkOuts: attendanceEntry?.checkOuts ?? 0,
      sales: salesEntry?.total ?? 0,
      transactions: salesEntry?.transactions ?? 0,
    };
  });
}

function describeRange(filters: DashboardMetrics["filters"]) {
  const start = new Date(filters.rangeStartIso);
  const end = new Date(filters.rangeEndIso);
  const startLabel = dateFormatter.format(start);
  const endLabel = dateFormatter.format(end);
  if (filters.rangeMode === "day") {
    return startLabel;
  }
  return `${startLabel} – ${endLabel}`;
}

function normalizeTimeInput(value: string) {
  return value.replace(/[^0-9:]/g, "");
}

export default function EnterpriseDashboardClient({
  snapshot,
  initialMetrics,
  employees,
  stores,
}: EnterpriseDashboardClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [metrics, setMetrics] = useState<DashboardMetrics>(initialMetrics);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipInitialFetch = useRef(true);

  // Initialize filters from URL parameters or use defaults from initialMetrics
  const [filters, setFilters] = useState<DashboardFiltersState>(() => {
    const rangeMode = (searchParams.get("rangeMode") as DashboardFiltersState["rangeMode"]) || initialMetrics.filters.rangeMode;
    const rangeValue = searchParams.get("rangeValue") || initialMetrics.filters.rangeValue;
    const store = searchParams.get("store") || initialMetrics.filters.store || "";
    const employee = searchParams.get("employee") || initialMetrics.filters.employee || "";
    const attendanceStatus = (searchParams.get("attendanceStatus") as DashboardFiltersState["attendanceStatus"]) || initialMetrics.filters.attendanceStatus;
    const salesStatus = searchParams.get("salesStatus") || initialMetrics.filters.salesStatus || "all";
    const timeFrom = searchParams.get("timeFrom") || initialMetrics.filters.timeFrom || "";
    const timeTo = searchParams.get("timeTo") || initialMetrics.filters.timeTo || "";

    return {
      rangeMode,
      rangeValue,
      store,
      employee,
      attendanceStatus,
      salesStatus,
      timeFrom,
      timeTo,
    };
  });

  // Sync filters to URL parameters
  useEffect(() => {
    const params = new URLSearchParams();

    if (filters.rangeMode) params.set("rangeMode", filters.rangeMode);
    if (filters.rangeValue) params.set("rangeValue", filters.rangeValue);
    if (filters.store) params.set("store", filters.store);
    if (filters.employee) params.set("employee", filters.employee);
    if (filters.attendanceStatus && filters.attendanceStatus !== "all") {
      params.set("attendanceStatus", filters.attendanceStatus);
    }
    if (filters.salesStatus && filters.salesStatus !== "all") {
      params.set("salesStatus", filters.salesStatus);
    }
    if (filters.timeFrom) params.set("timeFrom", filters.timeFrom);
    if (filters.timeTo) params.set("timeTo", filters.timeTo);

    router.replace(`?${params.toString()}`, { scroll: false });
  }, [filters, router]);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("rangeMode", filters.rangeMode);
        if (filters.rangeValue) params.set("rangeValue", filters.rangeValue);
        if (filters.store) params.set("store", filters.store);
        if (filters.employee) params.set("employee", filters.employee);
        params.set("variant", "metrics");
        if (filters.attendanceStatus !== "all") {
          params.set("attendanceStatus", filters.attendanceStatus);
        }
        if (filters.salesStatus && filters.salesStatus !== "all") {
          params.set("salesStatus", filters.salesStatus);
        }
        if (filters.timeFrom) params.set("timeFrom", filters.timeFrom);
        if (filters.timeTo) params.set("timeTo", filters.timeTo);

        const response = await fetch(`/api/admin/dashboard?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("ไม่สามารถโหลดข้อมูลแดชบอร์ดได้");
        }
        const payload = (await response.json()) as { metrics?: DashboardMetrics };
        if (!payload.metrics) {
          throw new Error("รูปแบบข้อมูลแดชบอร์ดไม่ถูกต้อง");
        }
        setMetrics(payload.metrics);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        const message =
          err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดแดชบอร์ด";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [filters]);

  const timelineData = useMemo(() => buildTimelineDataset(metrics), [metrics]);

  const storeLeaders = useMemo(() => metrics.sales.byStore.slice(0, 5), [metrics]);
  const employeeLeaders = useMemo(() => metrics.sales.byEmployee.slice(0, 5), [metrics]);
  const statusBreakdown = useMemo(() => metrics.sales.statuses.slice(0, 5), [metrics]);
  const topProducts = useMemo(() => snapshot.sales.topProducts.slice(0, 5), [snapshot]);

  const totalRevenueLabel = currencyFormatter.format(metrics.sales.totalRevenue ?? 0);
  const totalQuantityLabel = numberFormatter.format(metrics.sales.totalQuantity ?? 0);
  const totalTransactionsLabel = numberFormatter.format(metrics.sales.transactions ?? 0);

  const rangeDescription = describeRange(metrics.filters);
  const timeZone = snapshot.performance.metadata.timeZone;
  const lookbackDays = snapshot.performance.metadata.lookbackDays;

  return (
    <div className="space-y-8 print:bg-white">
      <header className="flex flex-col gap-4 rounded-3xl border border-blue-100/80 bg-gradient-to-br from-blue-600 via-sky-500 to-indigo-500 p-6 text-white shadow-[0_30px_120px_-80px_rgba(37,99,235,0.9)] print:border-none print:bg-white print:text-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Enterprise Operations Dashboard</h1>
            <p className="text-sm text-white/80 print:text-slate-600">
              ภาพรวมยอดขายและการลงเวลาประจำช่วง {rangeDescription}
            </p>
            <p className="mt-1 text-xs uppercase text-white/60 print:text-slate-400">
              อัปเดตล่าสุด {dateFormatter.format(new Date(snapshot.updatedAt))}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-2xl border border-white/40 bg-white/10 px-4 py-2 text-sm font-medium text-white shadow hover:bg-white/20"
            >
              พิมพ์รายงาน
            </button>
          </div>
        </div>
        <div className="grid gap-4 rounded-2xl bg-white/15 p-4 text-slate-900 shadow-inner print:bg-transparent print:p-0">
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="rounded-xl bg-white/90 p-4 shadow-sm print:border print:border-slate-200 print:bg-white">
              <p className="text-xs font-semibold text-slate-500">ยอดขาย (ช่วง)</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">
                {currencyFormatter.format(snapshot.kpis.sales.value)}
              </p>
              <p
                className={`mt-1 text-xs font-semibold ${
                  formatDelta(snapshot.kpis.sales.deltaPercent).tone === "down"
                    ? "text-red-600"
                    : formatDelta(snapshot.kpis.sales.deltaPercent).tone === "up"
                      ? "text-emerald-600"
                      : "text-slate-500"
                }`}
              >
                {formatDelta(snapshot.kpis.sales.deltaPercent).label} เทียบช่วงก่อนหน้า
              </p>
            </div>
            <div className="rounded-xl bg-white/90 p-4 shadow-sm print:border print:border-slate-200 print:bg-white">
              <p className="text-xs font-semibold text-slate-500">เช็กอิน</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">
                {numberFormatter.format(snapshot.kpis.attendance.value)} ครั้ง
              </p>
              <p
                className={`mt-1 text-xs font-semibold ${
                  formatDelta(snapshot.kpis.attendance.deltaPercent).tone === "down"
                    ? "text-red-600"
                    : formatDelta(snapshot.kpis.attendance.deltaPercent).tone === "up"
                      ? "text-emerald-600"
                      : "text-slate-500"
                }`}
              >
                {formatDelta(snapshot.kpis.attendance.deltaPercent).label} เทียบช่วงก่อนหน้า
              </p>
            </div>
            <div className="rounded-xl bg-white/90 p-4 shadow-sm print:border print:border-slate-200 print:bg-white">
              <p className="text-xs font-semibold text-slate-500">Average Ticket</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">
                {currencyFormatter.format(snapshot.kpis.averageTicket.value)}
              </p>
              <p
                className={`mt-1 text-xs font-semibold ${
                  formatDelta(snapshot.kpis.averageTicket.deltaPercent).tone === "down"
                    ? "text-red-600"
                    : formatDelta(snapshot.kpis.averageTicket.deltaPercent).tone === "up"
                      ? "text-emerald-600"
                      : "text-slate-500"
                }`}
              >
                {formatDelta(snapshot.kpis.averageTicket.deltaPercent).label} เทียบช่วงก่อนหน้า
              </p>
            </div>
            <div className="rounded-xl bg-white/90 p-4 shadow-sm print:border print:border-slate-200 print:bg-white">
              <p className="text-xs font-semibold text-slate-500">ธุรกรรม</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">
                {numberFormatter.format(snapshot.kpis.salesTransactions.value)} รายการ
              </p>
              <p
                className={`mt-1 text-xs font-semibold ${
                  formatDelta(snapshot.kpis.salesTransactions.deltaPercent).tone === "down"
                    ? "text-red-600"
                    : formatDelta(snapshot.kpis.salesTransactions.deltaPercent).tone === "up"
                      ? "text-emerald-600"
                      : "text-slate-500"
                }`}
              >
                {formatDelta(snapshot.kpis.salesTransactions.deltaPercent).label} เทียบช่วงก่อนหน้า
              </p>
            </div>
            <div className="rounded-xl bg-white/90 p-4 shadow-sm print:border print:border-slate-200 print:bg-white">
              <p className="text-xs font-semibold text-slate-500">กำลังคนที่เช็กอิน</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">
                {numberFormatter.format(snapshot.attendance.activeEmployees)} คน
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                ร้านทั้งหมด {numberFormatter.format(snapshot.totals.stores)} แห่ง
              </p>
            </div>
          </div>
          {snapshot.kpis.alerts.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-800 print:border-slate-200 print:bg-white print:text-slate-700">
              <p className="font-semibold uppercase tracking-wide">Early Alerts</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {snapshot.kpis.alerts.map((alert) => (
                  <li key={alert}>{alert}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:border print:border-slate-300">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">ตัวกรองข้อมูล</h2>
            <p className="text-xs text-slate-500">ปรับช่วงเวลาหรือมุมมองเพื่อเจาะลึกข้อมูล และพิมพ์ได้ทันที</p>
          </div>
          {isLoading && (
            <span className="text-xs font-medium text-blue-600">กำลังโหลดข้อมูล...</span>
          )}
        </div>
        {error && (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </div>
        )}
        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">โหมดช่วงเวลา</label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
              value={filters.rangeMode}
              onChange={(event) => {
                const nextMode = event.target.value as DashboardFiltersState["rangeMode"];
                setFilters((prev) => ({
                  ...prev,
                  rangeMode: nextMode,
                  rangeValue: getDefaultRangeValue(nextMode, timeZone),
                }));
              }}
            >
              <option value="day">รายวัน</option>
              <option value="week">รายสัปดาห์</option>
              <option value="month">รายเดือน</option>
              <option value="year">รายปี</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">ค่าอ้างอิงช่วงเวลา</label>
            {filters.rangeMode === "month" && (
              <input
                type="month"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                value={filters.rangeValue}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    rangeValue: event.target.value || prev.rangeValue,
                  }))
                }
              />
            )}
            {filters.rangeMode === "year" && (
              <input
                type="number"
                min={2000}
                max={9999}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                value={filters.rangeValue}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    rangeValue: event.target.value || getDefaultRangeValue("year", timeZone),
                  }))
                }
              />
            )}
            {(filters.rangeMode === "day" || filters.rangeMode === "week") && (
              <input
                type="date"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                value={filters.rangeValue}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    rangeValue:
                      event.target.value || getDefaultRangeValue(prev.rangeMode, timeZone),
                  }))
                }
              />
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">ร้านค้า</label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
              value={filters.store}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  store: event.target.value,
                }))
              }
            >
              <option value="">ทั้งหมด</option>
              {stores.map((store) => (
                <option key={store.id} value={store.name}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">พนักงาน</label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
              value={filters.employee}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  employee: event.target.value,
                }))
              }
            >
              <option value="">ทั้งหมด</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.name}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">สถานะลงเวลา</label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
              value={filters.attendanceStatus}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  attendanceStatus: event.target.value as DashboardFiltersState["attendanceStatus"],
                }))
              }
            >
              <option value="all">ทั้งหมด</option>
              <option value="check-in">เช็กอิน</option>
              <option value="check-out">เช็กเอาต์</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">สถานะยอดขาย</label>
            <select
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
              value={filters.salesStatus}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  salesStatus: event.target.value,
                }))
              }
            >
              <option value="all">ทั้งหมด</option>
              {metrics.sales.availableStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">เวลาเริ่ม (HH:MM)</label>
            <input
              type="text"
              placeholder="00:00"
              value={filters.timeFrom}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  timeFrom: normalizeTimeInput(event.target.value),
                }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">เวลาสิ้นสุด (HH:MM)</label>
            <input
              type="text"
              placeholder="23:59"
              value={filters.timeTo}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  timeTo: normalizeTimeInput(event.target.value),
                }))
              }
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:border print:border-slate-300">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">ภาพรวมยอดขาย & การลงเวลา</h2>
          <div className="text-xs text-slate-500">
            ช่วงอ้างอิง: {metrics.filters.rangeLabel}
          </div>
        </div>
        <div className="mt-4 h-80 w-full">
          <ResponsiveContainer>
            <ComposedChart data={timelineData} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
                width={70}
              />
              <Tooltip
                formatter={(value: number, name) => {
                  if (name === "ยอดขาย (บาท)") {
                    return [currencyFormatter.format(value), name];
                  }
                  return [numberFormatter.format(value), name];
                }}
                labelFormatter={(label) => `วันที่ ${label}`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar
                yAxisId="left"
                dataKey="sales"
                name="ยอดขาย (บาท)"
                fill="#3b82f6"
                radius={[6, 6, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="checkIns"
                name="เช็กอิน"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="transactions"
                name="ธุรกรรม"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3 print:border print:border-slate-300">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">ผู้นำด้านยอดขายตามสาขา</h2>
              <span className="text-xs text-slate-500">Top 5</span>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">ร้านค้า</th>
                    <th className="px-4 py-3 text-right">ยอดขาย</th>
                    <th className="px-4 py-3 text-right">ธุรกรรม</th>
                    <th className="px-4 py-3 text-right">จำนวนสินค้า</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {storeLeaders.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-400">
                        ยังไม่มีข้อมูลยอดขายในช่วงที่เลือก
                      </td>
                    </tr>
                  )}
                  {storeLeaders.map((store) => (
                    <tr key={store.label}>
                      <td className="px-4 py-3 font-medium text-slate-700">{store.label}</td>
                      <td className="px-4 py-3 text-right text-slate-900">
                        {currencyFormatter.format(store.total)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {numberFormatter.format(store.transactions)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {numberFormatter.format(store.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">ประสิทธิภาพทีมขาย</h2>
              <span className="text-xs text-slate-500">Top 5</span>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">พนักงาน</th>
                    <th className="px-4 py-3 text-right">ยอดขาย</th>
                    <th className="px-4 py-3 text-right">ธุรกรรม</th>
                    <th className="px-4 py-3 text-right">Avg Ticket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {employeeLeaders.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-400">
                        ยังไม่มีข้อมูลพนักงานในช่วงที่เลือก
                      </td>
                    </tr>
                  )}
                  {employeeLeaders.map((employee) => {
                    const averageTicket =
                      employee.transactions > 0
                        ? employee.total / employee.transactions
                        : 0;
                    return (
                      <tr key={employee.label}>
                        <td className="px-4 py-3 font-medium text-slate-700">{employee.label}</td>
                        <td className="px-4 py-3 text-right text-slate-900">
                          {currencyFormatter.format(employee.total)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {numberFormatter.format(employee.transactions)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {currencyFormatter.format(averageTicket)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">สถานะยอดขายยอดนิยม</h2>
              <span className="text-xs text-slate-500">Top 5</span>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">สถานะ</th>
                    <th className="px-4 py-3 text-right">ยอดขาย</th>
                    <th className="px-4 py-3 text-right">ธุรกรรม</th>
                    <th className="px-4 py-3 text-right">จำนวนสินค้า</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {statusBreakdown.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-400">
                        ยังไม่มีข้อมูลสถานะยอดขายในช่วงที่เลือก
                      </td>
                    </tr>
                  )}
                  {statusBreakdown.map((status) => (
                    <tr key={status.status}>
                      <td className="px-4 py-3 font-medium text-slate-700">{status.status}</td>
                      <td className="px-4 py-3 text-right text-slate-900">
                        {currencyFormatter.format(status.total)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {numberFormatter.format(status.transactions)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {numberFormatter.format(status.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">สรุปยอดขายรวม</h2>
            <dl className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <dt>ยอดขายรวม</dt>
                <dd className="font-semibold text-slate-900">{totalRevenueLabel}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>ธุรกรรมทั้งหมด</dt>
                <dd className="font-semibold text-slate-900">{totalTransactionsLabel}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>จำนวนสินค้ารวม</dt>
                <dd className="font-semibold text-slate-900">{totalQuantityLabel}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Average Ticket ปัจจุบัน</dt>
                <dd className="font-semibold text-slate-900">
                  {currencyFormatter.format(metrics.sales.averageTicket)}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>จำนวนพนักงานที่มียอดขาย</dt>
                <dd className="font-semibold text-slate-900">
                  {numberFormatter.format(metrics.sales.byEmployee.length)} คน
                </dd>
              </div>
            </dl>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              สินค้าขายดี (ย้อนหลัง {lookbackDays} วัน)
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              {topProducts.length === 0 && (
                <li className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center text-slate-400">
                  ยังไม่มีข้อมูลสินค้าในช่วงที่เลือก
                </li>
              )}
              {topProducts.map((product) => (
                <li key={product.name} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-700">{product.name}</span>
                    <span className="text-sm text-slate-500">
                      {currencyFormatter.format(product.total)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    ขายได้ {numberFormatter.format(product.quantity)} ชิ้น
                  </p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-emerald-800">Insight เชิงปฏิบัติการ</h2>
            <ul className="mt-4 space-y-3 text-sm text-emerald-700">
              <li>
                ทีมขายทั้งหมด {numberFormatter.format(metrics.attendance.uniqueEmployees)} คน มีการเช็กอิน
                {" "}
                {numberFormatter.format(metrics.attendance.total)} ครั้งในช่วงที่เลือก
              </li>
              <li>
                สาขาที่มียอดขายสูงสุด: {storeLeaders[0]?.label ?? "-"}
              </li>
              <li>
                พนักงานที่มียอดขายสูงสุด: {employeeLeaders[0]?.label ?? "-"}
              </li>
              <li>
                เวลาที่กรอง: {filters.timeFrom || "ทั้งหมด"} - {filters.timeTo || "ทั้งหมด"}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm print:border print:border-slate-300">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">แนวโน้มยอดขายรายวัน (ย้อนหลัง {snapshot.sales.dailyTrend.length} วัน)</h2>
        </div>
        <div className="mt-4 h-56 w-full">
          <ResponsiveContainer>
            <AreaChart data={snapshot.sales.dailyTrend} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="display" tick={{ fontSize: 11, fill: "#64748b" }} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} width={70} />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === "total") {
                    return [currencyFormatter.format(value), "ยอดขาย"];
                  }
                  if (name === "quantity") {
                    return [numberFormatter.format(value), "จำนวนสินค้า"];
                  }
                  return value;
                }}
              />
              <Area type="monotone" dataKey="total" name="ยอดขาย" stroke="#2563eb" fill="url(#salesGradient)" />
              <Line type="monotone" dataKey="quantity" name="จำนวนสินค้า" stroke="#14b8a6" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
