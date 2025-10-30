"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { getBrandingLogoSrc, getBrandingLogoUrl } from "@/lib/branding";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

type ExpenseDetail = {
  baselineExpenses: number;
  dailyAllowance: number;
  daysWithFullAttendance: number;
  items: Array<{
    label: string;
    amount: number;
  }>;
  total: number;
};

type EmployeeSummary = {
  employeeId: string;
  employeeName: string;
  storeName: string | null;
  workingDays: number;
  workingHours: number;
  totalSales: number;
  targetRevenuePC: number | null;
  achievementPercent: number | null;
  monthlyExpenses: number;
  expenseDetail: ExpenseDetail;
  netIncome: number;
  avgIncomePerDay: number;
  avgIncomePerHour: number;
};

type ReportTotals = {
  workingDays: number;
  workingHours: number;
  totalSales: number;
  totalSalesDisplay: string;
  monthlyExpenses: number;
  monthlyExpensesDisplay: string;
  netIncome: number;
  netIncomeDisplay: string;
  avgIncomePerDay: number;
  avgIncomePerDayDisplay: string;
  avgIncomePerHour: number;
  avgIncomePerHourDisplay: string;
};

type ReportData = {
  branding: {
    logoPath: string | null;
    updatedAt: string;
  };
  filters: {
    search: string | null;
    rangeSummary: string;
    effectiveMonth: string;
    ranges: Array<{
      startIso: string;
      endIso: string;
      label: string;
    }>;
  };
  rows: EmployeeSummary[];
  totals: ReportTotals;
};

const FALLBACK_LOGO = "/icons/icon-192x192.png";

type RangeItem = {
  id: string;
  start: string;
  end: string;
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function startOfWeek(date: Date) {
  const result = new Date(date);
  const day = result.getUTCDay();
  const diff = (day + 6) % 7;
  result.setUTCDate(result.getUTCDate() - diff);
  return new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth(), result.getUTCDate()));
}

function endOfWeek(date: Date) {
  const start = startOfWeek(date);
  start.setUTCDate(start.getUTCDate() + 6);
  return start;
}

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function createRangeItem(start: string, end: string) {
  const id =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return { id, start, end: end || start };
}

type FiltersState = {
  search: string;
};

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: ReportData }
  | { status: "error"; message: string };

function buildCsv(report: ReportData) {
  const headers = [
    "พนักงาน",
    "ร้านค้า",
    "วันทำงาน",
    "ชั่วโมงทำงาน",
    "ยอดขายรวม",
    "ค่าใช้จ่ายรายเดือน",
    "ยอดสุทธิ",
    "รายได้เฉลี่ย/วัน",
    "รายได้เฉลี่ย/ชม.",
  ];
  const rows = report.rows.map((row) => [
    row.employeeName,
    row.storeName ?? "",
    row.workingDays.toString(),
    row.workingHours.toFixed(1),
    row.totalSales.toFixed(2),
    row.monthlyExpenses.toFixed(2),
    row.netIncome.toFixed(2),
    row.avgIncomePerDay.toFixed(2),
    row.avgIncomePerHour.toFixed(2),
  ]);
  const all = [headers, ...rows];
  return all
    .map((cols) =>
      cols
        .map((value) => {
          if (value === null || value === undefined) return "";
          const needsQuote = /[",\n]/.test(value);
          if (!needsQuote) return value;
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\r\n");
}

function buildExcelXml(report: ReportData) {
  const headerRow = `
    <Row>
      <Cell><Data ss:Type="String">พนักงาน</Data></Cell>
      <Cell><Data ss:Type="String">ร้านค้า</Data></Cell>
      <Cell><Data ss:Type="String">วันทำงาน</Data></Cell>
      <Cell><Data ss:Type="String">ชั่วโมงทำงาน</Data></Cell>
      <Cell><Data ss:Type="String">ยอดขายรวม</Data></Cell>
      <Cell><Data ss:Type="String">ค่าใช้จ่ายรายเดือน</Data></Cell>
      <Cell><Data ss:Type="String">ยอดสุทธิ</Data></Cell>
      <Cell><Data ss:Type="String">รายได้เฉลี่ย/วัน</Data></Cell>
      <Cell><Data ss:Type="String">รายได้เฉลี่ย/ชม.</Data></Cell>
    </Row>
  `;

  const dataRows = report.rows
    .map(
      (row) => `
        <Row>
          <Cell><Data ss:Type="String">${row.employeeName}</Data></Cell>
          <Cell><Data ss:Type="String">${row.storeName ?? ""}</Data></Cell>
          <Cell><Data ss:Type="Number">${row.workingDays}</Data></Cell>
          <Cell><Data ss:Type="Number">${row.workingHours.toFixed(1)}</Data></Cell>
          <Cell><Data ss:Type="Number">${row.totalSales.toFixed(2)}</Data></Cell>
          <Cell><Data ss:Type="Number">${row.monthlyExpenses.toFixed(2)}</Data></Cell>
          <Cell><Data ss:Type="Number">${row.netIncome.toFixed(2)}</Data></Cell>
          <Cell><Data ss:Type="Number">${row.avgIncomePerDay.toFixed(2)}</Data></Cell>
          <Cell><Data ss:Type="Number">${row.avgIncomePerHour.toFixed(2)}</Data></Cell>
        </Row>
      `,
    )
    .join("");

  return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Report">
    <Table>
      ${headerRow}
      ${dataRows}
    </Table>
  </Worksheet>
</Workbook>`;
}

function downloadBlob(content: string, mime: string, filename: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function IndividualReportPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize filters from URL or use defaults
  const [filters, setFilters] = useState<FiltersState>(() => {
    const search = searchParams.get("search") || "";

    return {
      search,
    };
  });

  // Initialize ranges from URL or use defaults
  const [ranges, setRanges] = useState<RangeItem[]>(() => {
    const rangesParam = searchParams.get("ranges");
    if (rangesParam) {
      try {
        const parsed = JSON.parse(rangesParam) as Array<{ start: string; end: string }>;
        return parsed.map(r => createRangeItem(r.start, r.end));
      } catch {
        // Fall through to default
      }
    }

    // Default to current month
    const today = startOfToday();
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    return [createRangeItem(toIsoDate(start), toIsoDate(end))];
  });

  const [draftRange, setDraftRange] = useState<RangeItem>(() => {
    const today = startOfToday();
    const iso = toIsoDate(today);
    return createRangeItem(iso, iso);
  });

  const [state, setState] = useState<FetchState>({ status: "idle" });
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const reportContainerRef = useRef<HTMLDivElement | null>(null);

  // Sync filters and ranges to URL
  useEffect(() => {
    const params = new URLSearchParams();

    if (filters.search) params.set("search", filters.search);

    if (ranges.length > 0) {
      const rangesData = ranges.map(r => ({ start: r.start, end: r.end }));
      params.set("ranges", JSON.stringify(rangesData));
    }

    router.replace(`?${params.toString()}`, { scroll: false });
  }, [filters, ranges, router]);

  // Close tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeTooltip && reportContainerRef.current) {
        const target = event.target as Node;
        if (!reportContainerRef.current.contains(target)) {
          setActiveTooltip(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeTooltip]);

  useEffect(() => {
    if (ranges.length === 0) {
      setState({ status: "error", message: "กรุณาเลือกช่วงวันที่อย่างน้อย 1 รายการ" });
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    ranges.forEach((range) => {
      params.append("range", `${range.start}:${range.end}`);
    });

    setState({ status: "loading" });
    void fetch(`/api/admin/reports/individual?${params.toString()}`, {
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
  }, [filters, ranges]);

  const handleChange = (key: keyof FiltersState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddRangeInternal = useCallback(
    (startIso: string, endIso: string) => {
      const start = startIso.trim();
      if (!start) return;
      const end = (endIso && endIso.trim()) || start;
      const [normalizedStart, normalizedEnd] = start <= end ? [start, end] : [end, start];
      setRanges([createRangeItem(normalizedStart, normalizedEnd)]);
    },
    [setRanges],
  );

  const handleAddDraftRange = useCallback(() => {
    handleAddRangeInternal(draftRange.start, draftRange.end);
    const today = startOfToday();
    const iso = toIsoDate(today);
    setDraftRange(createRangeItem(iso, iso));
  }, [draftRange.end, draftRange.start, handleAddRangeInternal]);

  const handleRemoveRange = useCallback(
    (id: string) => {
      setRanges((prev) => prev.filter((range) => range.id !== id));
    },
    [setRanges],
  );

  const handleQuickRange = useCallback(
    (preset: "today" | "thisWeek" | "thisMonth" | "lastMonth" | "last30") => {
      const today = startOfToday();
      if (preset === "today") {
        const iso = toIsoDate(today);
        handleAddRangeInternal(iso, iso);
        return;
      }
      if (preset === "thisWeek") {
        const start = startOfWeek(today);
        const end = endOfWeek(today);
        handleAddRangeInternal(toIsoDate(start), toIsoDate(end));
        return;
      }
      if (preset === "thisMonth") {
        const start = startOfMonth(today);
        const end = endOfMonth(today);
        handleAddRangeInternal(toIsoDate(start), toIsoDate(end));
        return;
      }
      if (preset === "lastMonth") {
        const lastMonthDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1));
        const start = startOfMonth(lastMonthDate);
        const end = endOfMonth(lastMonthDate);
        handleAddRangeInternal(toIsoDate(start), toIsoDate(end));
        return;
      }
      if (preset === "last30") {
        const end = toIsoDate(today);
        const startDate = new Date(today);
        startDate.setUTCDate(startDate.getUTCDate() - 29);
        handleAddRangeInternal(toIsoDate(startDate), end);
      }
    },
    [handleAddRangeInternal],
  );

  const handleClearRanges = useCallback(() => {
    setRanges([]);
  }, [setRanges]);

  const handleExportCsv = () => {
    if (state.status !== "success") return;
    const csv = buildCsv(state.data);
    const filename = `individual-summary-report-${Date.now()}.csv`;
    downloadBlob(csv, "text/csv;charset=utf-8", filename);
  };

  const handleExportExcel = () => {
    if (state.status !== "success") return;
    const xml = buildExcelXml(state.data);
    const filename = `individual-summary-report-${Date.now()}.xls`;
    downloadBlob(xml, "application/vnd.ms-excel", filename);
  };

  const handlePrint = () => {
    if (state.status !== "success" || !state.data) return;

    // Supervisor signature should always be blank
    const supervisorSignatureName = "";

    const logoUrl = getBrandingLogoUrl(state.data.branding.logoPath, state.data.branding.updatedAt, {
      origin: window.location.origin,
    });
    const printTimestamp = new Intl.DateTimeFormat("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date());

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>รายงานสรุปรายบุคคล</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: A4 landscape;
      margin: 10mm;
    }

    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #000;
    }

    .container {
      width: 100%;
      max-width: 297mm;
      margin: 0 auto;
      padding: 20px;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #333;
      gap: 20px;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .company-logo {
      width: 64px;
      height: 64px;
      border: 1px solid #d1d5db;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #fff;
      padding: 6px;
    }

    .company-logo img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .company-names h1 {
      font-size: 18px;
      font-weight: bold;
      margin: 0;
    }

    .company-names p {
      font-size: 12px;
      color: #333;
      margin: 0;
    }

    .report-info {
      text-align: right;
      font-size: 11px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    thead {
      display: table-header-group;
    }

    th {
      background: linear-gradient(90deg, #2563eb, #1d4ed8);
      border: 1px solid #1e3a8a;
      padding: 8px 4px;
      text-align: center;
      font-weight: bold;
      color: #f8fafc;
      font-size: 10px;
    }

    td {
      border: 1px solid #333;
      padding: 6px 4px;
      text-align: center;
      font-size: 10px;
    }

    .text-right {
      text-align: right;
    }

    .text-left {
      text-align: left;
    }

    tfoot td {
      font-weight: bold;
      background-color: #f8f8f8;
    }

    @media print {
      .container {
        padding: 0;
      }
    }

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
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="header-left">
        <div class="company-logo">
          <img src="${logoUrl}" alt="โลโก้บริษัท" />
        </div>
        <div class="company-names">
          <h1>บริษัทเคพีฟู้ดส์ จำกัด</h1>
          <p>รายงานสรุปรายบุคคล</p>
        </div>
      </div>
      <div class="report-info">
        <p>ช่วงรายงาน: ${state.data.filters.rangeSummary}</p>
        <p>พิมพ์เอกสารเมื่อ: ${printTimestamp}</p>
      </div>
    </header>

    <table>
      <thead>
        <tr>
          <th>พนักงาน</th>
          <th>ร้านค้า</th>
          <th>วันทำงาน</th>
          <th>ชั่วโมงทำงาน</th>
          <th>ยอดขายรวม</th>
          <th>เป้าหมาย</th>
          <th>บรรลุเป้า</th>
          <th>ค่าใช้จ่ายรายเดือน</th>
          <th>ยอดสุทธิ</th>
          <th>รายได้เฉลี่ย/วัน</th>
          <th>รายได้เฉลี่ย/ชม.</th>
        </tr>
      </thead>
      <tbody>
        ${state.data.rows
          .map(
            (row) => `
          <tr>
            <td class="text-left">${row.employeeName}</td>
            <td>${row.storeName ?? "-"}</td>
            <td>${row.workingDays}</td>
            <td>${row.workingHours.toFixed(1)}</td>
            <td class="text-right">฿ ${row.totalSales.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right">${row.targetRevenuePC ? "฿ " + row.targetRevenuePC.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}</td>
            <td class="text-right">${row.achievementPercent != null ? row.achievementPercent.toFixed(1) + "%" : "-"}</td>
            <td class="text-right">฿ ${row.monthlyExpenses.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right">฿ ${row.netIncome.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right">฿ ${row.avgIncomePerDay.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right">฿ ${row.avgIncomePerHour.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        `,
          )
          .join("")}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" class="text-center">รวม</td>
          <td>${state.data.totals.workingDays}</td>
          <td>${state.data.totals.workingHours.toFixed(1)}</td>
          <td class="text-right">${state.data.totals.totalSalesDisplay}</td>
          <td></td>
          <td></td>
          <td class="text-right">${state.data.totals.monthlyExpensesDisplay}</td>
          <td class="text-right">${state.data.totals.netIncomeDisplay}</td>
          <td class="text-right">${state.data.totals.avgIncomePerDayDisplay}</td>
          <td class="text-right">${state.data.totals.avgIncomePerHourDisplay}</td>
        </tr>
      </tfoot>
    </table>

    <div class="signatures">
      <div class="signature-row">
        <!-- 1. พนักงาน -->
        <div class="signature-cell">
          <div class="signature-inline">
            <span>ลงชื่อ</span>
            <span class="signature-line"></span>
            <span>พนักงาน</span>
          </div>
          <span class="signature-name">(${state.data.rows.length === 1 ? state.data.rows[0].employeeName : '.....................'})</span>
          <span class="signature-date">วันที่ ___/___/___</span>
        </div>
        <!-- 2. ผู้ตรวจสอบ -->
        <div class="signature-cell">
          <div class="signature-inline">
            <span>ลงชื่อ</span>
            <span class="signature-line"></span>
            <span>ผู้ตรวจสอบ</span>
          </div>
          <span class="signature-name">(.....................)</span>
          <span class="signature-date">วันที่ ___/___/___</span>
        </div>
        <!-- 3. ซูเปอร์ไวเซอร์ -->
        <div class="signature-cell">
          <div class="signature-inline">
            <span>ลงชื่อ</span>
            <span class="signature-line"></span>
            <span>ซูเปอร์ไวเซอร์</span>
          </div>
          <span class="signature-name">(${supervisorSignatureName})</span>
          <span class="signature-date">วันที่ ___/___/___</span>
        </div>
        <!-- 4. ผู้อนุมัติ -->
        <div class="signature-cell">
          <div class="signature-inline">
            <span>ลงชื่อ</span>
            <span class="signature-line"></span>
            <span>ผู้อนุมัติ</span>
          </div>
          <span class="signature-name">(.....................)</span>
          <span class="signature-date">วันที่ ___/___/___</span>
        </div>
      </div>
    </div>

    <div style="margin-top: 16px; padding-top: 8px; border-top: 1px solid #cbd5e1; font-size: 10px; color: #64748b; text-align: center;">
      <p>จัดทำโดยระบบ Attendance Tracker PWA</p>
    </div>
  </div>
</body>
</html>
    `;

    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const toolbarDisabled = state.status === "loading";
  const report = state.status === "success" ? state.data : null;
  const displayLogo =
    getBrandingLogoSrc(
      report?.branding.logoPath ?? null,
      report?.branding.updatedAt ?? null,
      FALLBACK_LOGO,
    ) ?? FALLBACK_LOGO;
  const rangeSummary =
    report?.filters.rangeSummary ??
    (ranges.length > 0
      ? ranges
          .map((range) =>
            range.start === range.end ? range.start : `${range.start} ถึง ${range.end}`,
          )
          .join(", ")
      : "ยังไม่ระบุช่วงวันที่");

  return (
    <div className="space-y-6">
      <header className="space-y-3 print:hidden">
        <h1 className="text-2xl font-semibold text-slate-900 -mt-4 mb-2">รายงานสรุปรายบุคคล</h1>
        <p className="text-sm text-slate-500">
          สรุปข้อมูลการทำงาน ยอดขาย ค่าใช้จ่าย และรายได้เฉลี่ยของพนักงานแต่ละคน
        </p>
      </header>

      <section className="print:hidden rounded-3xl border border-blue-100 bg-white/90 p-3 sm:p-5 shadow-[0_30px_120px_-110px_rgba(37,99,235,0.8)]">
        <form className="grid gap-4" onSubmit={(event: FormEvent<HTMLFormElement>) => event.preventDefault()}>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">ค้นหาพนักงาน</label>
            <input
              type="text"
              placeholder="ค้นหาชื่อพนักงาน..."
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none"
              value={filters.search}
              onChange={(event: ChangeEvent<HTMLInputElement>) => handleChange("search", event.target.value)}
              disabled={toolbarDisabled}
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-600">ช่วงวันที่</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleQuickRange("today")}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={toolbarDisabled}
              >
                วันนี้
              </button>
              <button
                type="button"
                onClick={() => handleQuickRange("thisWeek")}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={toolbarDisabled}
              >
                สัปดาห์นี้
              </button>
              <button
                type="button"
                onClick={() => handleQuickRange("thisMonth")}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={toolbarDisabled}
              >
                เดือนนี้
              </button>
              <button
                type="button"
                onClick={() => handleQuickRange("lastMonth")}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={toolbarDisabled}
              >
                เดือนก่อน
              </button>
              <button
                type="button"
                onClick={() => handleQuickRange("last30")}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={toolbarDisabled}
              >
                30 วันที่ผ่านมา
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={draftRange.start}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setDraftRange((prev) => ({ ...prev, start: event.target.value }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none"
                disabled={toolbarDisabled}
              />
              <span className="text-xs font-medium text-slate-500">ถึง</span>
              <input
                type="date"
                value={draftRange.end}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setDraftRange((prev) => ({ ...prev, end: event.target.value }))
                }
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none"
                disabled={toolbarDisabled}
              />
              <button
                type="button"
                onClick={handleAddDraftRange}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 via-sky-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-[0_12px_35px_-30px_rgba(37,99,235,0.85)] transition disabled:cursor-not-allowed disabled:opacity-60"
                disabled={toolbarDisabled || !draftRange.start}
              >
                เพิ่มช่วง
              </button>
              {ranges.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearRanges}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={toolbarDisabled}
                >
                  ล้างทั้งหมด
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {ranges.length === 0 && (
                <span className="rounded-full border border-dashed border-slate-200 px-3 py-1 text-xs text-slate-500">
                  ยังไม่ได้เลือกช่วงวันที่
                </span>
              )}
              {ranges.map((range) => (
                <span
                  key={range.id}
                  className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/70 px-3 py-1 text-xs font-medium text-blue-700 shadow-sm"
                >
                  <span>
                    {range.start === range.end
                      ? range.start
                      : `${range.start} ถึง ${range.end}`}
                  </span>
                  <button
                    type="button"
                    className="rounded-full border border-transparent px-2 py-0.5 text-blue-600 transition hover:border-blue-400 hover:bg-white"
                    onClick={() => handleRemoveRange(range.id)}
                    disabled={toolbarDisabled}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
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
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={state.status !== "success"}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            ดาวน์โหลด CSV
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={state.status !== "success"}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            ดาวน์โหลด Excel
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

      <section className="space-y-4">
        <div className="print:hidden text-sm text-slate-500">
          ช่วงรายงาน: <span className="font-medium text-slate-700">{rangeSummary}</span>
        </div>

        <div
          ref={reportContainerRef}
          id="report-print-container"
          className="mx-auto w-full max-w-[1400px] border border-slate-200 bg-[#fdfdfc] p-4 md:p-8 shadow-[0_40px_140px_-100px_rgba(37,99,235,0.85)] print:mx-0 print:max-w-none print:border-none print:bg-white print:p-0 print:shadow-none"
        >
          <div className="mx-auto box-border flex w-full flex-col gap-6 rounded-[22px] bg-white p-4 md:p-6 text-[13px] shadow-[0_0_1px_rgba(15,23,42,0.08)] print:h-auto print:gap-4 print:rounded-none print:p-[10mm] print:text-[11px] print:shadow-none">
            <header className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-white p-2 print:h-12 print:w-12">
                  <Image
                    src={displayLogo}
                    alt="โลโก้บริษัท"
                    fill
                    sizes="64px"
                    className="object-contain"
                    priority
                    unoptimized={displayLogo.startsWith("http")}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-slate-900 whitespace-nowrap">
                    บริษัทเคพีฟู้ดส์ จำกัด
                  </p>
                  <p className="text-sm text-slate-600">รายงานสรุปรายบุคคล</p>
                </div>
              </div>
              <div className="hidden md:block text-right text-sm text-slate-600">
                <p>ช่วงรายงาน: {rangeSummary}</p>
              </div>
            </header>

            {report && (
              <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200">
                <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
                  <table className="min-w-full border-collapse" style={{ tableLayout: 'auto' }}>
                    <thead>
                      <tr className="bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500 text-[11px] font-semibold text-white">
                        <th className="border border-blue-200/40 px-2 py-2 text-left">พนักงาน</th>
                        <th className="border border-blue-200/40 px-2 py-2 text-center">ร้านค้า</th>
                        <th className="border border-blue-200/40 px-2 py-2 text-center">วันทำงาน</th>
                        <th className="border border-blue-200/40 px-2 py-2 text-center">ชั่วโมงทำงาน</th>
                        <th className="border border-blue-200/40 px-2 py-2 text-right">ยอดขายรวม</th>
                        <th className="border border-blue-200/40 px-2 py-2 text-right">ค่าใช้จ่ายรายเดือน</th>
                        <th className="border border-blue-200/40 px-2 py-2 text-right">ยอดสุทธิ</th>
                        <th className="border border-blue-200/40 px-2 py-2 text-right">รายได้เฉลี่ย/วัน</th>
                        <th className="border border-blue-200/40 px-2 py-2 text-right">รายได้เฉลี่ย/ชม.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.map((row, index) => {
                        const tooltipId = `expense-${row.employeeId}`;
                        const isTooltipActive = activeTooltip === tooltipId;

                        return (
                        <tr key={index} className="text-[11px] text-slate-700">
                          <td className="border border-slate-200 px-2 py-2 text-left whitespace-nowrap">
                            {row.employeeName}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-center whitespace-nowrap">
                            {row.storeName ?? "-"}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-center">
                            {row.workingDays}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-center">
                            {row.workingHours.toFixed(1)}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-right whitespace-nowrap">
                            ฿ {row.totalSales.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td
                            className="border border-slate-200 px-2 py-2 text-right whitespace-nowrap relative group cursor-help"
                            title={`รายละเอียดค่าใช้จ่าย`}
                            onClick={() => setActiveTooltip(isTooltipActive ? null : tooltipId)}
                            onMouseEnter={() => setActiveTooltip(tooltipId)}
                            onMouseLeave={() => setActiveTooltip(null)}
                          >
                            <span className="relative">
                              ฿ {row.monthlyExpenses.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {/* Tooltip */}
                            <div
                              className={`${
                                isTooltipActive ? 'visible' : 'invisible'
                              } absolute z-50 right-0 md:right-auto md:left-1/2 md:-translate-x-1/2 top-full mt-2 w-[280px] sm:w-72 rounded-lg border border-slate-200 bg-white p-3 shadow-xl`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="space-y-2">
                                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                  <p className="text-xs font-semibold text-slate-700">รายละเอียดค่าใช้จ่าย</p>
                                  <button
                                    className="md:hidden text-slate-400 hover:text-slate-600"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveTooltip(null);
                                    }}
                                  >
                                    ✕
                                  </button>
                                </div>

                                {/* รายการค่าใช้จ่ายฐาน */}
                                {row.expenseDetail.items.length > 0 && (
                                  <div className="space-y-1">
                                    {row.expenseDetail.items.map((item, idx) => (
                                      <div key={idx} className="flex justify-between text-xs text-slate-600">
                                        <span className="truncate mr-2">{item.label}</span>
                                        <span className="font-medium shrink-0">฿ {item.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* เบี้ยเลี้ยง */}
                                {row.expenseDetail.dailyAllowance > 0 && (
                                  <div className="flex justify-between text-xs text-blue-600 font-medium pt-1 border-t border-slate-100">
                                    <span className="truncate mr-2">เบี้ยเลี้ยง ({row.expenseDetail.daysWithFullAttendance} วัน × 150)</span>
                                    <span className="shrink-0">฿ {row.expenseDetail.dailyAllowance.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                                  </div>
                                )}

                                {/* รวม */}
                                <div className="flex justify-between text-xs font-bold text-slate-800 pt-2 border-t border-slate-300">
                                  <span>รวมทั้งหมด</span>
                                  <span>฿ {row.expenseDetail.total.toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-right whitespace-nowrap">
                            ฿ {row.netIncome.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-right whitespace-nowrap">
                            ฿ {row.avgIncomePerDay.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="border border-slate-200 px-2 py-2 text-right whitespace-nowrap">
                            ฿ {row.avgIncomePerHour.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 text-[11px] font-semibold text-slate-800">
                        <td className="border border-slate-200 px-2 py-2 text-center" colSpan={2}>
                          รวม
                        </td>
                        <td className="border border-slate-200 px-2 py-2 text-center">
                          {report.totals.workingDays}
                        </td>
                        <td className="border border-slate-200 px-2 py-2 text-center">
                          {report.totals.workingHours.toFixed(1)}
                        </td>
                        <td className="border border-slate-200 px-2 py-2 text-right whitespace-nowrap">
                          {report.totals.totalSalesDisplay}
                        </td>
                        <td className="border border-slate-200 px-2 py-2 text-right whitespace-nowrap">
                          {report.totals.monthlyExpensesDisplay}
                        </td>
                        <td className="border border-slate-200 px-2 py-2 text-right whitespace-nowrap">
                          {report.totals.netIncomeDisplay}
                        </td>
                        <td className="border border-slate-200 px-2 py-2 text-right whitespace-nowrap">
                          {report.totals.avgIncomePerDayDisplay}
                        </td>
                        <td className="border border-slate-200 px-2 py-2 text-right whitespace-nowrap">
                          {report.totals.avgIncomePerHourDisplay}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {report.rows.map((row, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                  >
                    {/* Header - Employee & Store */}
                    <div className="mb-3 border-b border-slate-100 pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-slate-900">{row.employeeName}</div>
                          <div className="mt-1 text-sm text-slate-600">
                            {row.storeName ?? "-"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500">ยอดสุทธิ</div>
                          <div className="text-lg font-bold text-emerald-700">
                            ฿ {row.netIncome.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Working Stats */}
                    <div className="mb-3 grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-3">
                        <div className="text-xs text-slate-500">วันทำงาน</div>
                        <div className="mt-1 text-xl font-bold text-blue-900">{row.workingDays}</div>
                        <div className="text-xs text-slate-500">วัน</div>
                      </div>
                      <div className="rounded-xl border border-purple-100 bg-purple-50/30 p-3">
                        <div className="text-xs text-slate-500">ชั่วโมงทำงาน</div>
                        <div className="mt-1 text-xl font-bold text-purple-900">{row.workingHours.toFixed(1)}</div>
                        <div className="text-xs text-slate-500">ชม.</div>
                      </div>
                    </div>

                    {/* Sales & Expenses */}
                    <div className="space-y-2">
                      <div className="flex justify-between rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2">
                        <span className="text-sm text-slate-600">ยอดขายรวม</span>
                        <span className="font-semibold text-emerald-700">
                          ฿ {row.totalSales.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Expenses with Expandable Details */}
                      <div className="rounded-lg border border-orange-100 bg-orange-50/50">
                        <button
                          className="flex w-full items-center justify-between px-3 py-2"
                          onClick={() => {
                            const tooltipId = `expense-mobile-${row.employeeId}`;
                            setActiveTooltip(activeTooltip === tooltipId ? null : tooltipId);
                          }}
                        >
                          <span className="text-sm text-slate-600">ค่าใช้จ่ายรายเดือน</span>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-orange-700">
                              ฿ {row.monthlyExpenses.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                            </span>
                            <svg
                              className={`h-4 w-4 text-slate-400 transition-transform ${
                                activeTooltip === `expense-mobile-${row.employeeId}` ? 'rotate-180' : ''
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        {/* Expense Details */}
                        {activeTooltip === `expense-mobile-${row.employeeId}` && (
                          <div className="border-t border-orange-100 px-3 py-2">
                            <div className="space-y-2">
                              {/* รายการค่าใช้จ่ายฐาน */}
                              {row.expenseDetail.items.length > 0 && (
                                <div className="space-y-1">
                                  {row.expenseDetail.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-xs text-slate-600">
                                      <span className="truncate mr-2">{item.label}</span>
                                      <span className="font-medium shrink-0">
                                        ฿ {item.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* เบี้ยเลี้ยง */}
                              {row.expenseDetail.dailyAllowance > 0 && (
                                <div className="flex justify-between text-xs text-blue-600 font-medium pt-1 border-t border-orange-100">
                                  <span className="truncate mr-2">
                                    เบี้ยเลี้ยง ({row.expenseDetail.daysWithFullAttendance} วัน × 150)
                                  </span>
                                  <span className="shrink-0">
                                    ฿ {row.expenseDetail.dailyAllowance.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}

                              {/* รวม */}
                              <div className="flex justify-between text-xs font-bold text-slate-800 pt-2 border-t border-orange-200">
                                <span>รวมทั้งหมด</span>
                                <span>
                                  ฿ {row.expenseDetail.total.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Average Income */}
                    <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                      <div>
                        <div className="text-xs text-slate-500">รายได้เฉลี่ย/วัน</div>
                        <div className="mt-1 text-base font-semibold text-slate-900">
                          ฿ {row.avgIncomePerDay.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">รายได้เฉลี่ย/ชม.</div>
                        <div className="mt-1 text-base font-semibold text-slate-900">
                          ฿ {row.avgIncomePerHour.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Mobile Summary Card */}
                <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 p-4">
                  <div className="mb-3 text-center font-semibold text-blue-900">สรุปรวมทั้งหมด</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">วันทำงาน</span>
                      <span className="font-semibold text-slate-900">{report.totals.workingDays} วัน</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">ชั่วโมงทำงาน</span>
                      <span className="font-semibold text-slate-900">{report.totals.workingHours.toFixed(1)} ชม.</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-blue-200 pt-2">
                      <span className="text-slate-600">ยอดขายรวม</span>
                      <span className="font-semibold text-emerald-700">{report.totals.totalSalesDisplay}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">ค่าใช้จ่ายรายเดือน</span>
                      <span className="font-semibold text-orange-700">{report.totals.monthlyExpensesDisplay}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold border-t-2 border-blue-300 pt-2">
                      <span className="text-blue-900">ยอดสุทธิ</span>
                      <span className="text-blue-900">{report.totals.netIncomeDisplay}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t border-blue-200 pt-2">
                      <span className="text-slate-600">รายได้เฉลี่ย/วัน</span>
                      <span className="font-semibold text-slate-900">{report.totals.avgIncomePerDayDisplay}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">รายได้เฉลี่ย/ชม.</span>
                      <span className="font-semibold text-slate-900">{report.totals.avgIncomePerHourDisplay}</span>
                    </div>
                  </div>
                </div>
              </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
