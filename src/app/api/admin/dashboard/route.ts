import { NextResponse } from "next/server";
import {
  getDashboardMetrics,
  getDashboardSnapshot,
  type DashboardFilterOptions,
  type DashboardRangeMode,
} from "@/lib/configStore";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const variant = (searchParams.get("variant") ?? "snapshot").toLowerCase();

  if (variant === "metrics") {
    const filters: DashboardFilterOptions = {};
    const rangeMode = searchParams.get("rangeMode");
    const rangeValue = searchParams.get("rangeValue");
    if (rangeMode || rangeValue) {
      filters.range = {};
      if (rangeMode) {
        filters.range.mode = rangeMode as DashboardRangeMode;
      }
      if (rangeValue) {
        filters.range.value = rangeValue;
      }
    }
    const store = searchParams.get("store");
    if (store) {
      filters.store = store;
    }
    const employee = searchParams.get("employee");
    if (employee) {
      filters.employee = employee;
    }
    const attendanceStatus = searchParams.get("attendanceStatus");
    if (attendanceStatus) {
      filters.attendanceStatus = attendanceStatus as DashboardFilterOptions["attendanceStatus"];
    }
    const salesStatus = searchParams.get("salesStatus");
    if (salesStatus) {
      filters.salesStatus = salesStatus;
    }
    const timeFrom = searchParams.get("timeFrom");
    if (timeFrom) {
      filters.timeFrom = timeFrom;
    }
    const timeTo = searchParams.get("timeTo");
    if (timeTo) {
      filters.timeTo = timeTo;
    }

    const metrics = await getDashboardMetrics(filters);
    return NextResponse.json({ metrics });
  }

  const snapshot = await getDashboardSnapshot();
  return NextResponse.json({ snapshot });
}
