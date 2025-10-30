"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type FiltersState = {
  employeeId: string;
  storeId: string;
  month: number;
  year: number;
  day: string;
  page: number;
  pageSize: number;
};

const TIME_ZONE = "Asia/Bangkok";

const getCurrentDateParts = () => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year, month] = formatter.format(new Date()).split("-");
  return {
    month: Number.parseInt(month, 10),
    year: Number.parseInt(year, 10),
  };
};

export function useReportFilters(defaultEmployeeId: string = "") {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = getCurrentDateParts();

  // Initialize state from URL params or defaults
  const [filters, setFilters] = useState<FiltersState>(() => {
    const params = new URLSearchParams(searchParams.toString());

    return {
      employeeId: params.get("employeeId") || defaultEmployeeId,
      storeId: params.get("storeId") || "",
      month: parseInt(params.get("month") || "") || current.month,
      year: parseInt(params.get("year") || "") || current.year,
      day: params.get("day") || "",
      page: parseInt(params.get("page") || "") || 1,
      pageSize: parseInt(params.get("pageSize") || "") || 50,
    };
  });

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();

    if (filters.employeeId) params.set("employeeId", filters.employeeId);
    if (filters.storeId) params.set("storeId", filters.storeId);
    params.set("month", filters.month.toString());
    params.set("year", filters.year.toString());
    if (filters.day) params.set("day", filters.day);
    if (filters.page > 1) params.set("page", filters.page.toString());
    if (filters.pageSize !== 50) params.set("pageSize", filters.pageSize.toString());

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;

    // Use replace to avoid adding to history on filter changes
    router.replace(newUrl, { scroll: false });
  }, [filters, pathname, router]);

  const handleChange = useCallback((key: keyof FiltersState, value: string | number) => {
    // Reset to page 1 when filters change (except for page/pageSize changes)
    const resetPage = key !== "page" && key !== "pageSize";

    setFilters((prev) => ({
      ...prev,
      [key]: typeof value === "string" && (key === "month" || key === "year" || key === "page" || key === "pageSize")
        ? Number(value)
        : value,
      ...(resetPage ? { page: 1 } : {}),
    }));
  }, []);

  const handleClearDay = useCallback(() => {
    setFilters((prev) => ({ ...prev, day: "", page: 1 }));
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  }, []);

  return {
    filters,
    handleChange,
    handleClearDay,
    handlePageChange,
  };
}