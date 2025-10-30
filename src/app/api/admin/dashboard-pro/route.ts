import { NextResponse } from "next/server";
import {
  getAllLogs,
  getEmployees,
  getStores,
  getProducts,
  type LogEntry,
  type EmployeeRecord,
  type StoreRecord,
  type ProductRecord,
} from "@/lib/configStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DASHBOARD_TIME_ZONE =
  process.env.GOOGLE_SHEETS_TIMEZONE?.trim() ||
  process.env.APP_TIMEZONE?.trim() ||
  "Asia/Bangkok";

type AttendanceRecord = {
  timestamp: Date;
  dayKey: string;
  monthKey: string;
  yearKey: string;
  storeName: string;
  employeeName: string;
  status: "check-in" | "check-out";
  hour: number;
  dayOfWeek: number;
};

type SalesRecord = {
  timestamp: Date;
  dayKey: string;
  monthKey: string;
  yearKey: string;
  storeName: string;
  employeeName: string;
  productName: string;
  productCode: string;
  total: number;
  quantity: number;
  status: string;
  hour: number;
  dayOfWeek: number;
};

function getZonedDateParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = formatter.formatToParts(date);
  const lookup = new Map(parts.map((part) => [part.type, part.value]));

  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6
  };

  return {
    year: Number.parseInt(lookup.get("year") ?? "0", 10),
    month: Number.parseInt(lookup.get("month") ?? "0", 10),
    day: Number.parseInt(lookup.get("day") ?? "0", 10),
    hour: Number.parseInt(lookup.get("hour") ?? "0", 10),
    minute: Number.parseInt(lookup.get("minute") ?? "0", 10),
    second: Number.parseInt(lookup.get("second") ?? "0", 10),
    dayOfWeek: weekdayMap[lookup.get("weekday") ?? "Sun"] ?? 0,
  };
}

function padNumber(value: number): string {
  return value.toString().padStart(2, "0");
}

function getDayKey(year: number, month: number, day: number): string {
  return `${year}-${padNumber(month)}-${padNumber(day)}`;
}

function getMonthKey(year: number, month: number): string {
  return `${year}-${padNumber(month)}`;
}

function getYearKey(year: number): string {
  return `${year}`;
}

function normalizeValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback;
}

function parseRecords(logs: LogEntry[], timeZone: string) {
  const attendanceRecords: AttendanceRecord[] = [];
  const salesRecords: SalesRecord[] = [];

  for (const log of logs) {
    if (log.scope === "attendance") {
      const meta = log.meta ?? {};
      const timestampRaw =
        typeof meta.timestamp === "string" && meta.timestamp ? meta.timestamp : log.timestamp;
      const timestamp = timestampRaw ? new Date(timestampRaw) : null;
      if (!timestamp || Number.isNaN(timestamp.valueOf())) continue;

      const parts = getZonedDateParts(timestamp, timeZone);
      const statusRaw = typeof meta.status === "string" ? meta.status.toLowerCase() : "check-in";
      const status: AttendanceRecord["status"] =
        statusRaw === "check-out" ? "check-out" : "check-in";

      attendanceRecords.push({
        timestamp,
        dayKey: getDayKey(parts.year, parts.month, parts.day),
        monthKey: getMonthKey(parts.year, parts.month),
        yearKey: getYearKey(parts.year),
        storeName: normalizeValue(meta.storeName, "ไม่ระบุ"),
        employeeName: normalizeValue(meta.employeeName, "ไม่ระบุ"),
        status,
        hour: parts.hour,
        dayOfWeek: parts.dayOfWeek,
      });
    } else if (log.scope === "sales") {
      const meta = log.meta ?? {};
      const timestampRaw =
        typeof meta.timestamp === "string" && meta.timestamp ? meta.timestamp : log.timestamp;
      const timestamp = timestampRaw ? new Date(timestampRaw) : null;
      if (!timestamp || Number.isNaN(timestamp.valueOf())) continue;

      const parts = getZonedDateParts(timestamp, timeZone);
      const rawTotal =
        typeof meta.total === "number"
          ? meta.total
          : Number.parseFloat(String(meta.total ?? "0"));
      if (!Number.isFinite(rawTotal)) continue;

      const rawQuantity =
        typeof meta.quantity === "number"
          ? meta.quantity
          : Number.parseFloat(String(meta.quantity ?? "0"));
      if (!Number.isFinite(rawQuantity)) continue;

      const status =
        typeof meta.status === "string" && meta.status.trim()
          ? meta.status.trim().toLowerCase()
          : "completed";

      salesRecords.push({
        timestamp,
        dayKey: getDayKey(parts.year, parts.month, parts.day),
        monthKey: getMonthKey(parts.year, parts.month),
        yearKey: getYearKey(parts.year),
        storeName: normalizeValue(meta.storeName, "ไม่ระบุ"),
        employeeName: normalizeValue(meta.employeeName, "ไม่ระบุ"),
        productName: normalizeValue(meta.productName, "ไม่ระบุ"),
        productCode: normalizeValue(meta.productCode, ""),
        total: rawTotal,
        quantity: rawQuantity,
        status,
        hour: parts.hour,
        dayOfWeek: parts.dayOfWeek,
      });
    }
  }

  return { attendanceRecords, salesRecords };
}

function calculateAdvancedMetrics(
  attendanceRecords: AttendanceRecord[],
  salesRecords: SalesRecord[],
  employees: EmployeeRecord[],
  stores: StoreRecord[],
  products: ProductRecord[],
) {
  const now = new Date();

  // Time ranges for comparisons
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last60Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Filter records by time periods
  const attendance30d = attendanceRecords.filter((r) => r.timestamp >= last30Days);
  const attendance60d = attendanceRecords.filter((r) => r.timestamp >= last60Days && r.timestamp < last30Days);
  const sales30d = salesRecords.filter((r) => r.timestamp >= last30Days);
  const sales60d = salesRecords.filter((r) => r.timestamp >= last60Days && r.timestamp < last30Days);

  // KPI Calculations
  const totalCheckIns30d = attendance30d.filter((r) => r.status === "check-in").length;
  const totalCheckIns60d = attendance60d.filter((r) => r.status === "check-in").length;

  const totalRevenue30d = sales30d.reduce((sum, r) => sum + r.total, 0);
  const totalRevenue60d = sales60d.reduce((sum, r) => sum + r.total, 0);

  const avgRevenue30d = sales30d.length > 0 ? totalRevenue30d / sales30d.length : 0;
  const avgRevenue60d = sales60d.length > 0 ? totalRevenue60d / sales60d.length : 0;

  const uniqueEmployees30d = new Set(attendance30d.filter(r => r.status === "check-in").map((r) => r.employeeName)).size;
  const uniqueEmployees60d = new Set(attendance60d.filter(r => r.status === "check-in").map((r) => r.employeeName)).size;

  // Calculate trends (MoM growth)
  const revenueGrowth = totalRevenue60d > 0 ? ((totalRevenue30d - totalRevenue60d) / totalRevenue60d) * 100 : 0;
  const checkInGrowth = totalCheckIns60d > 0 ? ((totalCheckIns30d - totalCheckIns60d) / totalCheckIns60d) * 100 : 0;
  const activeEmployeeGrowth = uniqueEmployees60d > 0 ? ((uniqueEmployees30d - uniqueEmployees60d) / uniqueEmployees60d) * 100 : 0;

  // Heatmap data (day of week vs hour of day)
  const attendanceHeatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const record of attendance30d) {
    if (record.status === "check-in") {
      attendanceHeatmap[record.dayOfWeek]![record.hour]! += 1;
    }
  }

  const salesHeatmap = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const record of sales30d) {
    salesHeatmap[record.dayOfWeek]![record.hour]! += record.total;
  }

  // Store performance analysis
  const storePerformance = new Map<string, {
    checkIns: number;
    revenue: number;
    transactions: number;
    avgTicket: number;
    employees: Set<string>;
  }>();

  for (const record of attendance30d) {
    if (record.status === "check-in") {
      const data = storePerformance.get(record.storeName) ?? {
        checkIns: 0,
        revenue: 0,
        transactions: 0,
        avgTicket: 0,
        employees: new Set<string>(),
      };
      data.checkIns += 1;
      data.employees.add(record.employeeName);
      storePerformance.set(record.storeName, data);
    }
  }

  for (const record of sales30d) {
    const data = storePerformance.get(record.storeName) ?? {
      checkIns: 0,
      revenue: 0,
      transactions: 0,
      avgTicket: 0,
      employees: new Set<string>(),
    };
    data.revenue += record.total;
    data.transactions += 1;
    data.avgTicket = data.transactions > 0 ? data.revenue / data.transactions : 0;
    storePerformance.set(record.storeName, data);
  }

  const storeMetrics = Array.from(storePerformance.entries())
    .map(([name, data]) => ({
      name,
      checkIns: data.checkIns,
      revenue: Number(data.revenue.toFixed(2)),
      transactions: data.transactions,
      avgTicket: Number(data.avgTicket.toFixed(2)),
      activeEmployees: data.employees.size,
      efficiency: data.checkIns > 0 ? Number((data.revenue / data.checkIns).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Employee performance analysis
  const employeePerformance = new Map<string, {
    checkIns: number;
    revenue: number;
    transactions: number;
    avgTicket: number;
    stores: Set<string>;
    products: Set<string>;
  }>();

  for (const record of attendance30d) {
    if (record.status === "check-in") {
      const data = employeePerformance.get(record.employeeName) ?? {
        checkIns: 0,
        revenue: 0,
        transactions: 0,
        avgTicket: 0,
        stores: new Set<string>(),
        products: new Set<string>(),
      };
      data.checkIns += 1;
      data.stores.add(record.storeName);
      employeePerformance.set(record.employeeName, data);
    }
  }

  for (const record of sales30d) {
    const data = employeePerformance.get(record.employeeName) ?? {
      checkIns: 0,
      revenue: 0,
      transactions: 0,
      avgTicket: 0,
      stores: new Set<string>(),
      products: new Set<string>(),
    };
    data.revenue += record.total;
    data.transactions += 1;
    data.avgTicket = data.transactions > 0 ? data.revenue / data.transactions : 0;
    data.products.add(record.productName);
    employeePerformance.set(record.employeeName, data);
  }

  const employeeMetrics = Array.from(employeePerformance.entries())
    .map(([name, data]) => ({
      name,
      checkIns: data.checkIns,
      revenue: Number(data.revenue.toFixed(2)),
      transactions: data.transactions,
      avgTicket: Number(data.avgTicket.toFixed(2)),
      storesWorked: data.stores.size,
      productsSold: data.products.size,
      productivity: data.checkIns > 0 ? Number((data.transactions / data.checkIns).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Product analysis
  const productMetrics = new Map<string, {
    revenue: number;
    quantity: number;
    transactions: number;
    avgPrice: number;
  }>();

  for (const record of sales30d) {
    const data = productMetrics.get(record.productName) ?? {
      revenue: 0,
      quantity: 0,
      transactions: 0,
      avgPrice: 0,
    };
    data.revenue += record.total;
    data.quantity += record.quantity;
    data.transactions += 1;
    data.avgPrice = data.quantity > 0 ? data.revenue / data.quantity : 0;
    productMetrics.set(record.productName, data);
  }

  const productAnalysis = Array.from(productMetrics.entries())
    .map(([name, data]) => ({
      name,
      revenue: Number(data.revenue.toFixed(2)),
      quantity: Number(data.quantity.toFixed(2)),
      transactions: data.transactions,
      avgPrice: Number(data.avgPrice.toFixed(2)),
    }))
    .sort((a, b) => b.revenue - a.revenue);

  // Daily timeline (last 30 days)
  const dailyTimeline = new Map<string, {
    checkIns: number;
    checkOuts: number;
    revenue: number;
    transactions: number;
    activeEmployees: Set<string>;
  }>();

  for (let i = 29; i >= 0; i -= 1) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const parts = getZonedDateParts(date, DASHBOARD_TIME_ZONE);
    const key = getDayKey(parts.year, parts.month, parts.day);
    dailyTimeline.set(key, {
      checkIns: 0,
      checkOuts: 0,
      revenue: 0,
      transactions: 0,
      activeEmployees: new Set<string>(),
    });
  }

  for (const record of attendance30d) {
    const data = dailyTimeline.get(record.dayKey);
    if (data) {
      if (record.status === "check-in") {
        data.checkIns += 1;
        data.activeEmployees.add(record.employeeName);
      } else {
        data.checkOuts += 1;
      }
    }
  }

  for (const record of sales30d) {
    const data = dailyTimeline.get(record.dayKey);
    if (data) {
      data.revenue += record.total;
      data.transactions += 1;
    }
  }

  const timelineData = Array.from(dailyTimeline.entries()).map(([date, data]) => ({
    date,
    checkIns: data.checkIns,
    checkOuts: data.checkOuts,
    revenue: Number(data.revenue.toFixed(2)),
    transactions: data.transactions,
    activeEmployees: data.activeEmployees.size,
    avgTicket: data.transactions > 0 ? Number((data.revenue / data.transactions).toFixed(2)) : 0,
  }));

  // Sparkline data (last 7 days for quick view)
  const sparklineData = timelineData.slice(-7);

  // Correlation analysis: Check-ins vs Revenue
  const correlationData = timelineData.map((d) => ({
    checkIns: d.checkIns,
    revenue: d.revenue,
  }));

  // Calculate Pearson correlation coefficient
  const n = correlationData.length;
  const sumX = correlationData.reduce((sum, d) => sum + d.checkIns, 0);
  const sumY = correlationData.reduce((sum, d) => sum + d.revenue, 0);
  const sumXY = correlationData.reduce((sum, d) => sum + d.checkIns * d.revenue, 0);
  const sumX2 = correlationData.reduce((sum, d) => sum + d.checkIns * d.checkIns, 0);
  const sumY2 = correlationData.reduce((sum, d) => sum + d.revenue * d.revenue, 0);

  const correlation =
    n > 0 && sumX2 - (sumX * sumX) / n > 0 && sumY2 - (sumY * sumY) / n > 0
      ? (n * sumXY - sumX * sumY) /
        Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY))
      : 0;

  // Alert generation
  const alerts: Array<{ type: "warning" | "critical" | "info"; message: string }> = [];

  if (revenueGrowth < -20) {
    alerts.push({ type: "critical", message: `Revenue decreased by ${Math.abs(revenueGrowth).toFixed(1)}% compared to previous period` });
  } else if (revenueGrowth < -10) {
    alerts.push({ type: "warning", message: `Revenue decreased by ${Math.abs(revenueGrowth).toFixed(1)}% compared to previous period` });
  }

  if (checkInGrowth < -15) {
    alerts.push({ type: "warning", message: `Check-ins decreased by ${Math.abs(checkInGrowth).toFixed(1)}% compared to previous period` });
  }

  if (correlation < 0.3) {
    alerts.push({ type: "info", message: "Low correlation between check-ins and revenue detected" });
  }

  return {
    kpis: {
      revenue: {
        current: Number(totalRevenue30d.toFixed(2)),
        previous: Number(totalRevenue60d.toFixed(2)),
        growth: Number(revenueGrowth.toFixed(2)),
        sparkline: sparklineData.map((d) => d.revenue),
      },
      transactions: {
        current: sales30d.length,
        previous: sales60d.length,
        growth: sales60d.length > 0 ? Number((((sales30d.length - sales60d.length) / sales60d.length) * 100).toFixed(2)) : 0,
        sparkline: sparklineData.map((d) => d.transactions),
      },
      avgTicket: {
        current: Number(avgRevenue30d.toFixed(2)),
        previous: Number(avgRevenue60d.toFixed(2)),
        growth: avgRevenue60d > 0 ? Number((((avgRevenue30d - avgRevenue60d) / avgRevenue60d) * 100).toFixed(2)) : 0,
        sparkline: sparklineData.map((d) => d.avgTicket),
      },
      checkIns: {
        current: totalCheckIns30d,
        previous: totalCheckIns60d,
        growth: Number(checkInGrowth.toFixed(2)),
        sparkline: sparklineData.map((d) => d.checkIns),
      },
      activeEmployees: {
        current: uniqueEmployees30d,
        previous: uniqueEmployees60d,
        growth: Number(activeEmployeeGrowth.toFixed(2)),
        sparkline: sparklineData.map((d) => d.activeEmployees),
      },
    },
    timeline: timelineData,
    heatmaps: {
      attendance: attendanceHeatmap,
      sales: salesHeatmap,
    },
    stores: storeMetrics.slice(0, 10),
    employees: employeeMetrics.slice(0, 10),
    products: productAnalysis.slice(0, 10),
    correlation: {
      value: Number(correlation.toFixed(3)),
      strength:
        Math.abs(correlation) > 0.7
          ? "strong"
          : Math.abs(correlation) > 0.4
            ? "moderate"
            : "weak",
    },
    alerts,
    metadata: {
      totalEmployees: employees.length,
      totalStores: stores.length,
      totalProducts: products.length,
      dataPoints: {
        attendance: attendanceRecords.length,
        sales: salesRecords.length,
      },
      generatedAt: now.toISOString(),
      timezone: DASHBOARD_TIME_ZONE,
    },
  };
}

export async function GET() {
  try {
    const [logs, employees, stores, products] = await Promise.all([
      getAllLogs(),
      getEmployees(),
      getStores(),
      getProducts(),
    ]);

    const { attendanceRecords, salesRecords } = parseRecords(logs, DASHBOARD_TIME_ZONE);
    const metrics = calculateAdvancedMetrics(
      attendanceRecords,
      salesRecords,
      employees,
      stores,
      products,
    );

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error("[dashboard-pro] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate dashboard metrics",
      },
      { status: 500 },
    );
  }
}
