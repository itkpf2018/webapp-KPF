import { NextResponse } from "next/server";
import { getEmployees, getStores } from "@/lib/configStore";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RangeMode = "today" | "week" | "month" | "year";

type RangeResult = {
  start: Date;
  end: Date;
  previousStart: Date;
  previousEnd: Date;
};

type SalesRow = {
  recorded_date: string | null;
  employee_name: string | null;
  store_name: string | null;
  product_name: string | null;
  quantity: number | null;
  unit_price: number | null;
  total: number | null;
};

type AttendanceRow = {
  recorded_date: string | null;
  recorded_time: string | null;
  status: string | null;
  employee_name: string | null;
  store_name: string | null;
};

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function resolveRange(mode: RangeMode, reference = new Date()): RangeResult {
  const now = new Date(reference.valueOf());
  switch (mode) {
    case "today": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start.valueOf());
      end.setHours(23, 59, 59, 999);
      const previousStart = subDays(start, 1);
      const previousEnd = subDays(end, 1);
      return { start, end, previousStart, previousEnd };
    }
    case "week": {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });
      const previousStart = subWeeks(start, 1);
      const previousEnd = subWeeks(end, 1);
      return { start, end, previousStart, previousEnd };
    }
    case "year": {
      const start = startOfYear(now);
      const end = endOfYear(now);
      const previous = subYears(now, 1);
      const previousStart = startOfYear(previous);
      const previousEnd = endOfYear(previous);
      return { start, end, previousStart, previousEnd };
    }
    case "month":
    default: {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      const previous = subMonths(now, 1);
      const previousStart = startOfMonth(previous);
      const previousEnd = endOfMonth(previous);
      return { start, end, previousStart, previousEnd };
    }
  }
}

async function querySales(start: Date, end: Date) {
  const client = getSupabaseServiceClient();
  const { data, error } = await client
    .from("sales_records")
    .select(
      "recorded_date, employee_name, store_name, product_name, quantity, unit_price, total",
    )
    .gte("recorded_date", toIsoDate(start))
    .lte("recorded_date", toIsoDate(end));

  if (error) {
    console.error("[analytics] sales query error", error);
    return [] as SalesRow[];
  }
  return (data ?? []) as SalesRow[];
}

async function queryAttendance(start: Date, end: Date) {
  const client = getSupabaseServiceClient();
  const { data, error } = await client
    .from("attendance_records")
    .select("recorded_date, recorded_time, status, employee_name, store_name")
    .gte("recorded_date", toIsoDate(start))
    .lte("recorded_date", toIsoDate(end));

  if (error) {
    console.error("[analytics] attendance query error", error);
    return [] as AttendanceRow[];
  }
  return (data ?? []) as AttendanceRow[];
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const rangeParam = (url.searchParams.get("range") as RangeMode | null) ?? "month";
    const storeParam = url.searchParams.get("store");
    const employeeParam = url.searchParams.get("employee");

    const { start, end, previousStart, previousEnd } = resolveRange(rangeParam);

    const [stores, employees, salesCurrent, attendanceCurrent, salesPrevious, attendancePrevious] =
      await Promise.all([
        getStores(),
        getEmployees(),
        querySales(start, end),
        queryAttendance(start, end),
        querySales(previousStart, previousEnd),
        queryAttendance(previousStart, previousEnd),
      ]);

    const storeMap = new Map(stores.map((store) => [store.id, store.name?.trim() ?? ""]));
    const employeeMap = new Map(employees.map((emp) => [emp.id, emp.name?.trim() ?? ""]));

    const storeNameFilter = storeParam && storeParam !== "all" ? storeMap.get(storeParam) ?? null : null;
    const employeeNameFilter =
      employeeParam && employeeParam !== "all" ? employeeMap.get(employeeParam) ?? null : null;

    const filteredSales = salesCurrent.filter((row) => {
      if (storeNameFilter && (row.store_name ?? "").trim() !== storeNameFilter) return false;
      if (employeeNameFilter && (row.employee_name ?? "").trim() !== employeeNameFilter) return false;
      return true;
    });

    const filteredAttendance = attendanceCurrent.filter((row) => {
      if (storeNameFilter && (row.store_name ?? "").trim() !== storeNameFilter) return false;
      if (employeeNameFilter && (row.employee_name ?? "").trim() !== employeeNameFilter) return false;
      return true;
    });

    const totalRevenue = filteredSales.reduce((sum, row) => sum + Number(row.total ?? 0), 0);
    const totalTransactions = filteredSales.length;
    const totalAttendance = filteredAttendance.filter((row) => (row.status ?? "check-in") === "check-in").length;
    const activeEmployees = new Set(filteredAttendance.map((row) => row.employee_name ?? "")).size;
    const averageTicket = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    const previousRevenue = salesPrevious.reduce((sum, row) => sum + Number(row.total ?? 0), 0);
    const previousTransactions = salesPrevious.length;
    const previousAttendance = attendancePrevious.filter((row) => (row.status ?? "check-in") === "check-in").length;

    const percentChange = (current: number, previous: number) => {
      if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
      if (previous === 0) return current === 0 ? 0 : 100;
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    const revenueTrend = percentChange(totalRevenue, previousRevenue);
    const transactionsTrend = percentChange(totalTransactions, previousTransactions);
    const attendanceTrend = percentChange(totalAttendance, previousAttendance);

    const salesByDate = new Map<string, { sales: number; transactions: number }>();
    filteredSales.forEach((row) => {
      if (!row.recorded_date) return;
      const label = format(new Date(row.recorded_date), "dd MMM");
      const current = salesByDate.get(label) ?? { sales: 0, transactions: 0 };
      salesByDate.set(label, {
        sales: current.sales + Number(row.total ?? 0),
        transactions: current.transactions + 1,
      });
    });

    const attendanceByDate = new Map<string, { checkIn: number; checkOut: number }>();
    filteredAttendance.forEach((row) => {
      if (!row.recorded_date) return;
      const label = format(new Date(row.recorded_date), "dd MMM");
      const current = attendanceByDate.get(label) ?? { checkIn: 0, checkOut: 0 };
      const status = (row.status ?? "check-in").toLowerCase();
      attendanceByDate.set(label, {
        checkIn: current.checkIn + (status === "check-in" ? 1 : 0),
        checkOut: current.checkOut + (status === "check-out" ? 1 : 0),
      });
    });

    const salesTrend = Array.from(salesByDate.entries()).map(([label, value]) => ({
      date: label,
      sales: value.sales,
      transactions: value.transactions,
    }));

    const attendanceTrendData = Array.from(attendanceByDate.entries()).map(([label, value]) => ({
      date: label,
      checkIn: value.checkIn,
      checkOut: value.checkOut,
    }));

    const topStores = new Map<string, { total: number; transactions: number; quantity: number }>();
    filteredSales.forEach((row) => {
      const key = row.store_name?.trim() || "ไม่ระบุร้าน";
      const current = topStores.get(key) ?? { total: 0, transactions: 0, quantity: 0 };
      topStores.set(key, {
        total: current.total + Number(row.total ?? 0),
        transactions: current.transactions + 1,
        quantity: current.quantity + Number(row.quantity ?? 0),
      });
    });

    const topEmployees = new Map<string, { total: number; transactions: number; quantity: number }>();
    filteredSales.forEach((row) => {
      const key = row.employee_name?.trim() || "ไม่ระบุพนักงาน";
      const current = topEmployees.get(key) ?? { total: 0, transactions: 0, quantity: 0 };
      topEmployees.set(key, {
        total: current.total + Number(row.total ?? 0),
        transactions: current.transactions + 1,
        quantity: current.quantity + Number(row.quantity ?? 0),
      });
    });

    const response = {
      kpis: {
        totalRevenue,
        totalTransactions,
        totalAttendance,
        activeEmployees,
        averageTicket,
        conversionRate: 0.72,
        revenueTrend,
        transactionsTrend,
        attendanceTrend,
      },
      charts: {
        salesTrend,
        attendanceTrend: attendanceTrendData,
      },
      breakdowns: {
        salesByStore: Array.from(topStores.entries()).map(([label, value]) => ({
          label,
          total: value.total,
          transactions: value.transactions,
          quantity: value.quantity,
        })),
        salesByEmployee: Array.from(topEmployees.entries()).map(([label, value]) => ({
          label,
          total: value.total,
          transactions: value.transactions,
          quantity: value.quantity,
        })),
      },
    };

    return NextResponse.json({ ok: true, data: response });
  } catch (error) {
    console.error("[analytics] error", error);
    return NextResponse.json(
      { ok: false, message: "ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 },
    );
  }
}
