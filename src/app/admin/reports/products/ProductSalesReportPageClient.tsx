"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { FileDown, FileSpreadsheet, Printer, Eye, ChevronDown, ChevronRight } from "lucide-react";
import { getBrandingLogoSrc, getBrandingLogoUrl } from "@/lib/branding";
import type { BrandingSettings, EmployeeRecord, ProductSalesReport } from "@/lib/configStore";

const CURRENCY_FORMATTER = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

const NUMBER_FORMATTER = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 2,
});

function formatCurrency(value: number) {
  return CURRENCY_FORMATTER.format(value).replace("฿", "฿ ");
}

function formatNumber(value: number) {
  return NUMBER_FORMATTER.format(value);
}

function formatShort(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return formatNumber(value);
}

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

function toThaiDate(isoDay: string, timeZone: string) {
  return new Intl.DateTimeFormat("th-TH", {
    timeZone,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${isoDay}T00:00:00Z`));
}

type SimplifiedEmployee = Pick<EmployeeRecord, "id" | "name" | "province" | "region">;

type RangeItem = {
  id: string;
  start: string;
  end: string;
};

type ProductSalesReportPageClientProps = {
  initialReport: ProductSalesReport;
  employees: SimplifiedEmployee[];
  branding: BrandingSettings;
};

function createRangeItem(start: string, end: string) {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    start,
    end,
  };
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

function buildCsv(report: ProductSalesReport) {
  const headers = [
    "SKU",
    "สินค้า",
    "กล่อง จำนวน",
    "กล่อง ยอดขาย",
    "แพ็ค จำนวน",
    "แพ็ค ยอดขาย",
    "ปี๊บ/ซอง จำนวน",
    "ปี๊บ/ซอง ยอดขาย",
    "รวมยอดขาย",
  ];

  const rows = report.products.map((product) => [
    product.productCode || "-",
    product.productName,
    product.unitData.box.quantity.toString(),
    product.unitData.box.revenuePC.toFixed(2),
    product.unitData.pack.quantity.toString(),
    product.unitData.pack.revenuePC.toFixed(2),
    product.unitData.piece.quantity.toString(),
    product.unitData.piece.revenuePC.toFixed(2),
    product.totalRevenuePC.toFixed(2),
  ]);

  // Add summary row
  const summary = report.summary;
  rows.push([
    "",
    "รวมทั้งหมด",
    summary.unitBreakdown.box.quantity.toString(),
    summary.unitBreakdown.box.revenuePC.toFixed(2),
    summary.unitBreakdown.pack.quantity.toString(),
    summary.unitBreakdown.pack.revenuePC.toFixed(2),
    summary.unitBreakdown.piece.quantity.toString(),
    summary.unitBreakdown.piece.revenuePC.toFixed(2),
    summary.totalRevenuePC.toFixed(2),
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

function buildExcelXml(report: ProductSalesReport) {
  const headerRow = `
    <Row>
      <Cell><Data ss:Type="String">SKU</Data></Cell>
      <Cell><Data ss:Type="String">สินค้า</Data></Cell>
      <Cell><Data ss:Type="String">กล่อง จำนวน</Data></Cell>
      <Cell><Data ss:Type="String">กล่อง ยอดขาย</Data></Cell>
      <Cell><Data ss:Type="String">แพ็ค จำนวน</Data></Cell>
      <Cell><Data ss:Type="String">แพ็ค ยอดขาย</Data></Cell>
      <Cell><Data ss:Type="String">ปี๊บ/ซอง จำนวน</Data></Cell>
      <Cell><Data ss:Type="String">ปี๊บ/ซอง ยอดขาย</Data></Cell>
      <Cell><Data ss:Type="String">รวมยอดขาย</Data></Cell>
    </Row>
  `;

  const dataRows = report.products
    .map(
      (product) => `
        <Row>
          <Cell><Data ss:Type="String">${product.productCode || "-"}</Data></Cell>
          <Cell><Data ss:Type="String">${product.productName}</Data></Cell>
          <Cell><Data ss:Type="Number">${product.unitData.box.quantity}</Data></Cell>
          <Cell><Data ss:Type="Number">${product.unitData.box.revenuePC.toFixed(2)}</Data></Cell>
          <Cell><Data ss:Type="Number">${product.unitData.pack.quantity}</Data></Cell>
          <Cell><Data ss:Type="Number">${product.unitData.pack.revenuePC.toFixed(2)}</Data></Cell>
          <Cell><Data ss:Type="Number">${product.unitData.piece.quantity}</Data></Cell>
          <Cell><Data ss:Type="Number">${product.unitData.piece.revenuePC.toFixed(2)}</Data></Cell>
          <Cell><Data ss:Type="Number">${product.totalRevenuePC.toFixed(2)}</Data></Cell>
        </Row>
      `,
    )
    .join("");

  // Add summary row
  const summary = report.summary;
  const summaryRow = `
    <Row>
      <Cell><Data ss:Type="String"></Data></Cell>
      <Cell><Data ss:Type="String">รวมทั้งหมด</Data></Cell>
      <Cell><Data ss:Type="Number">${summary.unitBreakdown.box.quantity}</Data></Cell>
      <Cell><Data ss:Type="Number">${summary.unitBreakdown.box.revenuePC.toFixed(2)}</Data></Cell>
      <Cell><Data ss:Type="Number">${summary.unitBreakdown.pack.quantity}</Data></Cell>
      <Cell><Data ss:Type="Number">${summary.unitBreakdown.pack.revenuePC.toFixed(2)}</Data></Cell>
      <Cell><Data ss:Type="Number">${summary.unitBreakdown.piece.quantity}</Data></Cell>
      <Cell><Data ss:Type="Number">${summary.unitBreakdown.piece.revenuePC.toFixed(2)}</Data></Cell>
      <Cell><Data ss:Type="Number">${summary.totalRevenuePC.toFixed(2)}</Data></Cell>
    </Row>
  `;

  return `<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Product Sales Report">
    <Table>
      ${headerRow}
      ${dataRows}
      ${summaryRow}
    </Table>
  </Worksheet>
</Workbook>`;
}

export default function ProductSalesReportPageClient({
  initialReport,
  employees,
  branding,
}: ProductSalesReportPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [report, setReport] = useState<ProductSalesReport>(initialReport);
  const [selectedProduct, setSelectedProduct] = useState<ProductSalesReport["products"][number] | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  // Initialize selectedEmployeeIds from URL or initial report
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>(() => {
    const employeeIdsParam = searchParams.get("employeeIds");
    if (employeeIdsParam) {
      return employeeIdsParam.split(",").filter(Boolean);
    }
    return initialReport.filters.employees.map((employee) => employee.id);
  });

  // Initialize ranges from URL or initial report
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
    return initialReport.filters.ranges.map((range) => createRangeItem(range.startIso, range.endIso));
  });

  const [draftRange, setDraftRange] = useState<RangeItem>(() => {
    const today = startOfToday();
    const iso = toIsoDate(today);
    return createRangeItem(iso, iso);
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipInitialFetch = useRef(true);

  const timeZone = report.filters.timeZone;

  const addRange = useCallback((startIso: string, endIso: string) => {
    if (!startIso) return;
    const normalizedEnd = endIso || startIso;
    setRanges((prev) => [...prev, createRangeItem(startIso, normalizedEnd)]);
  }, []);

  const removeRange = useCallback((id: string) => {
    setRanges((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const handleQuickRange = useCallback((preset: "today" | "thisWeek" | "thisMonth" | "lastMonth" | "last30") => {
    const today = startOfToday();
    if (preset === "today") {
      const iso = toIsoDate(today);
      addRange(iso, iso);
      return;
    }
    if (preset === "thisWeek") {
      const start = startOfWeek(today);
      const end = endOfWeek(today);
      addRange(toIsoDate(start), toIsoDate(end));
      return;
    }
    if (preset === "thisMonth") {
      const start = startOfMonth(today);
      const end = endOfMonth(today);
      addRange(toIsoDate(start), toIsoDate(end));
      return;
    }
    if (preset === "lastMonth") {
      const start = startOfMonth(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)));
      const end = endOfMonth(start);
      addRange(toIsoDate(start), toIsoDate(end));
      return;
    }
    if (preset === "last30") {
      const end = toIsoDate(today);
      const startDate = new Date(today);
      startDate.setUTCDate(startDate.getUTCDate() - 29);
      addRange(toIsoDate(startDate), end);
    }
  }, [addRange]);

  const handleAddManualRange = () => {
    if (!draftRange.start) return;
    addRange(draftRange.start, draftRange.end);
  };

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();

    if (selectedEmployeeIds.length > 0) {
      params.set("employeeIds", selectedEmployeeIds.join(","));
    }

    if (ranges.length > 0) {
      const rangesData = ranges.map(r => ({ start: r.start, end: r.end }));
      params.set("ranges", JSON.stringify(rangesData));
    }

    router.replace(`?${params.toString()}`, { scroll: false });
  }, [selectedEmployeeIds, ranges, router]);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    if (ranges.length === 0) {
      setError("กรุณาเลือกช่วงวันที่อย่างน้อย 1 รายการ");
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        ranges.forEach((range) => params.append("range", `${range.start}:${range.end}`));
        if (selectedEmployeeIds.length > 0) {
          params.set("employeeIds", selectedEmployeeIds.join(","));
        }
        const response = await fetch(`/api/admin/reports/products?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("ไม่สามารถโหลดรายงานได้");
        }
        const payload = (await response.json()) as { report: ProductSalesReport };
        setReport(payload.report);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดรายงาน");
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [ranges, selectedEmployeeIds]);

  const handleToggleEmployee = (id: string) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const clearEmployees = () => setSelectedEmployeeIds([]);

  const selectedEmployeeNames =
    selectedEmployeeIds.length > 0
      ? report.filters.employees.map((item) => item.name).join(", ")
      : "ทั้งหมด";

  const hasProducts = report.products.length > 0;

  const openModal = (product: ProductSalesReport["products"][number]) => {
    setSelectedProduct(product);
  };

  const closeModal = () => {
    setSelectedProduct(null);
  };

  const toggleExpand = (productKey: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productKey)) {
        next.delete(productKey);
      } else {
        next.add(productKey);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allKeys = new Set(report.products.map((p) => p.productKey));
    setExpandedProducts(allKeys);
  };

  const collapseAll = () => {
    setExpandedProducts(new Set());
  };

  const handleExportCsv = () => {
    const csv = buildCsv(report);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `product-sales-report-${timestamp}.csv`;
    downloadBlob(csv, "text/csv;charset=utf-8", filename);
  };

  const handleExportExcel = () => {
    const xml = buildExcelXml(report);
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `product-sales-report-${timestamp}.xls`;
    downloadBlob(xml, "application/vnd.ms-excel", filename);
  };

  const handlePrint = () => {
    // Auto-expand all products before printing
    expandAll();

    // Small delay to ensure state updates
    setTimeout(() => {
      // Supervisor signature should always be blank
      const supervisorSignatureName = "";

      const logoUrl = getBrandingLogoUrl(branding.logoPath, branding.updatedAt, {
        origin: typeof window !== "undefined" ? window.location.origin : "",
      });

      const printTimestamp = new Intl.DateTimeFormat("th-TH", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).format(new Date());

      const tableRows = report.products
      .map(
        (product) => {
          // Main product row
          const mainRow = `
          <tr class="font-bold">
            <td class="text-center">${product.productCode || "-"}</td>
            <td class="text-left">${product.productName}</td>
            <!-- Box -->
            <td class="text-center">${product.unitData.box.quantity || "-"}</td>
            <td class="text-right text-emerald">${product.unitData.box.revenuePC > 0 ? formatCurrency(product.unitData.box.revenuePC) : "-"}</td>
            <!-- Pack -->
            <td class="text-center">${product.unitData.pack.quantity || "-"}</td>
            <td class="text-right text-emerald">${product.unitData.pack.revenuePC > 0 ? formatCurrency(product.unitData.pack.revenuePC) : "-"}</td>
            <!-- Piece -->
            <td class="text-center">${product.unitData.piece.quantity || "-"}</td>
            <td class="text-right text-emerald">${product.unitData.piece.revenuePC > 0 ? formatCurrency(product.unitData.piece.revenuePC) : "-"}</td>
            <!-- Totals -->
            <td class="text-right font-bold text-emerald">${formatCurrency(product.totalRevenuePC)}</td>
          </tr>`;

          // Store breakdown rows
          const storeRows = (product.storeBreakdown && product.storeBreakdown.length > 0)
            ? product.storeBreakdown.map(store => {
                return `
          <tr class="bg-gray-50" style="font-size: 10px;">
            <td class="text-center" style="color: #94a3b8;"></td>
            <td class="text-left" style="padding-left: 24px; color: #64748b;">└─ 🏪 ${store.storeName}</td>
            <!-- Box -->
            <td class="text-center" style="color: #64748b;">${store.unitData.box.quantity || "-"}</td>
            <td class="text-right" style="color: #059669;">${store.unitData.box.revenuePC > 0 ? formatCurrency(store.unitData.box.revenuePC) : "-"}</td>
            <!-- Pack -->
            <td class="text-center" style="color: #64748b;">${store.unitData.pack.quantity || "-"}</td>
            <td class="text-right" style="color: #059669;">${store.unitData.pack.revenuePC > 0 ? formatCurrency(store.unitData.pack.revenuePC) : "-"}</td>
            <!-- Piece -->
            <td class="text-center" style="color: #64748b;">${store.unitData.piece.quantity || "-"}</td>
            <td class="text-right" style="color: #059669;">${store.unitData.piece.revenuePC > 0 ? formatCurrency(store.unitData.piece.revenuePC) : "-"}</td>
            <!-- Totals -->
            <td class="text-right" style="color: #059669;">${formatCurrency(store.totalRevenuePC)}</td>
          </tr>`;
              }).join("")
            : "";

          return mainRow + storeRows;
        }
      )
      .join("");

    const summary = report.summary;
    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>รายงานยอดขายรายสินค้า</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: A4 landscape;
      margin: 8mm;
    }

    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #000;
    }

    .container {
      width: 100%;
      padding: 5mm;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
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
      margin-bottom: 4px;
    }

    .company-names p {
      font-size: 11px;
      color: #555;
      margin: 0;
    }

    .report-info {
      text-align: right;
      font-size: 11px;
    }

    .report-info p {
      margin: 2px 0;
    }

    .summary-section {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .summary-card {
      text-align: center;
    }

    .summary-card .label {
      font-size: 10px;
      color: #64748b;
      margin-bottom: 4px;
    }

    .summary-card .value {
      font-size: 14px;
      font-weight: bold;
      color: #1e293b;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      border: 1px solid #000;
    }

    thead {
      display: table-header-group;
    }

    tbody tr {
      page-break-inside: avoid;
    }

    th {
      background: #e2e8f0;
      border: 1px solid #000;
      padding: 6px 4px;
      text-align: center;
      font-weight: bold;
      font-size: 9px;
      white-space: nowrap;
    }

    td {
      border: 1px solid #000;
      padding: 4px;
      font-size: 9px;
      white-space: nowrap;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .font-bold { font-weight: bold; }

    .text-emerald { color: #059669; }
    .text-amber { color: #d97706; }
    .text-blue { color: #2563eb; }

    .bg-emerald-sub { background: rgba(236, 253, 245, 0.5) !important; }
    .bg-amber-sub { background: rgba(254, 243, 199, 0.5) !important; }

    tfoot {
      background: #f1f5f9;
      font-weight: bold;
    }

    .footer {
      margin-top: 16px;
      padding-top: 8px;
      border-top: 1px solid #cbd5e1;
      font-size: 10px;
      color: #64748b;
      text-align: center;
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
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo" />` : ""}
        </div>
        <div class="company-names">
          <h1>รายงานยอดขายรายสินค้า</h1>
          <p>${report.filters.rangeSummary}</p>
        </div>
      </div>
      <div class="report-info">
        <p>พิมพ์เมื่อ: ${printTimestamp}</p>
      </div>
    </header>

    <div class="summary-section">
      <div class="summary-card">
        <div class="label">ยอดขายรวม</div>
        <div class="value">${formatCurrency(summary.totalRevenuePC)}</div>
      </div>
      <div class="summary-card">
        <div class="label">จำนวนสินค้า</div>
        <div class="value">${summary.uniqueProducts} รายการ</div>
      </div>
      <div class="summary-card">
        <div class="label">จำนวนชิ้นรวม</div>
        <div class="value">${formatNumber(summary.totalQuantity)} ชิ้น</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th rowspan="2">SKU</th>
          <th rowspan="2">สินค้า</th>
          <th colspan="2" class="bg-emerald-sub">กล่อง</th>
          <th colspan="2" class="bg-emerald-sub">แพ็ค</th>
          <th colspan="2" class="bg-emerald-sub">ปี๊บ/ซอง</th>
          <th rowspan="2">รวม PC</th>
        </tr>
        <tr>
          <th>จำนวน</th><th>PC</th>
          <th>จำนวน</th><th>PC</th>
          <th>จำนวน</th><th>PC</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" class="text-center">รวมทั้งหมด</td>
          <td class="text-center">${summary.unitBreakdown.box.quantity}</td>
          <td class="text-right text-emerald">${formatCurrency(summary.unitBreakdown.box.revenuePC)}</td>
          <td class="text-center">${summary.unitBreakdown.pack.quantity}</td>
          <td class="text-right text-emerald">${formatCurrency(summary.unitBreakdown.pack.revenuePC)}</td>
          <td class="text-center">${summary.unitBreakdown.piece.quantity}</td>
          <td class="text-right text-emerald">${formatCurrency(summary.unitBreakdown.piece.revenuePC)}</td>
          <td class="text-right font-bold text-emerald">${formatCurrency(summary.totalRevenuePC)}</td>
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
          <span class="signature-name">(${report.filters.employees.length === 1 ? report.filters.employees[0].name : '.....................'})</span>
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

    <div class="footer">
      <p>จัดทำโดยระบบ Attendance Tracker PWA</p>
    </div>
  </div>
</body>
</html>
    `;

      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 250);
      }
    }, 100); // Wait for expand state to update
  };

  return (
    <div id="report-print-root" className="space-y-6">
      <header className="space-y-3 print:hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-900 -mt-4 mb-2">รายงานยอดขายรายสินค้า</h1>
            <p className="text-sm text-slate-500">
              สรุปยอดขายแบบเรียลไทม์ จำแนกตามสินค้า พร้อมกรองได้หลายช่วงเวลาและหลายพนักงาน
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={expandAll}
              disabled={report.products.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronDown className="h-4 w-4" />
              ขยายทั้งหมด
            </button>
            <button
              type="button"
              onClick={collapseAll}
              disabled={report.products.length === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
              ย่อทั้งหมด
            </button>
          </div>
        </div>
      </header>

      {/* Filters Section */}
      <section className="print:hidden rounded-3xl border border-blue-100 bg-white/90 p-4 shadow-[0_30px_120px_-110px_rgba(37,99,235,0.8)]">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">ช่วงวันที่ (เพิ่มได้หลายช่วง)</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleQuickRange("today")}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
              >
                วันนี้
              </button>
              <button
                type="button"
                onClick={() => handleQuickRange("thisWeek")}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
              >
                สัปดาห์นี้
              </button>
              <button
                type="button"
                onClick={() => handleQuickRange("thisMonth")}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
              >
                เดือนนี้
              </button>
              <button
                type="button"
                onClick={() => handleQuickRange("lastMonth")}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
              >
                เดือนที่แล้ว
              </button>
              <button
                type="button"
                onClick={() => handleQuickRange("last30")}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
              >
                30 วันที่ผ่านมา
              </button>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600">จากวันที่</label>
                <input
                  type="date"
                  value={draftRange.start}
                  className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  onChange={(event) =>
                    setDraftRange((prev) => ({ ...prev, start: event.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">ถึงวันที่</label>
                <input
                  type="date"
                  value={draftRange.end}
                  min={draftRange.start}
                  className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  onChange={(event) =>
                    setDraftRange((prev) => ({ ...prev, end: event.target.value || prev.start }))
                  }
                />
              </div>
              <button
                type="button"
                onClick={handleAddManualRange}
                className="inline-flex items-center rounded-xl bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_50px_-25px_rgba(37,99,235,0.9)]"
              >
                เพิ่มช่วง
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {ranges.map((range, index) => (
                <span
                  key={range.id}
                  className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700"
                >
                  <span>
                    {toThaiDate(range.start, timeZone)}
                    {range.start !== range.end ? ` – ${toThaiDate(range.end, timeZone)}` : ""}
                  </span>
                  {ranges.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRange(range.id)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      ×
                    </button>
                  )}
                  <span className="text-[10px] text-blue-400">#{index + 1}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">พนักงาน (เลือกหลายคนได้)</h2>
            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="grid max-h-40 grid-cols-2 gap-2 overflow-y-auto text-sm text-slate-600">
                {employees.map((employee) => {
                  const checked = selectedEmployeeIds.includes(employee.id);
                  return (
                    <label key={employee.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleEmployee(employee.id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span>{employee.name}</span>
                    </label>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>เลือกแล้ว {selectedEmployeeIds.length} คน</span>
                {selectedEmployeeIds.length > 0 && (
                  <button type="button" onClick={clearEmployees} className="text-blue-600 hover:underline">
                    ล้างการเลือก
                  </button>
                )}
              </div>
            </div>
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                {error}
              </div>
            )}
            {isLoading && (
              <p className="text-xs font-medium text-blue-600">กำลังโหลดรายงาน...</p>
            )}
          </div>
        </div>
      </section>

      {/* Mini Summary Bar */}
      <section className="print:hidden rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <span>
            ยอดขาย: <strong className="text-emerald-700">{formatCurrency(report.summary.totalRevenuePC)}</strong>
          </span>
          <span className="text-slate-300">•</span>
          <span>
            สินค้า: <strong>{report.summary.uniqueProducts} รายการ</strong>
          </span>
          <span className="text-slate-300">•</span>
          <span>
            <strong>{formatNumber(report.summary.totalQuantity)} ชิ้น</strong>
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500">{report.filters.rangeSummary}</span>
        </div>
      </section>

      {/* Export Buttons */}
      <section className="print:hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isLoading || !hasProducts}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileDown className="h-4 w-4" />
            ดาวน์โหลด CSV
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isLoading || !hasProducts}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4" />
            ดาวน์โหลด Excel
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={isLoading || !hasProducts}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_50px_-25px_rgba(37,99,235,0.9)] transition hover:shadow-[0_20px_60px_-25px_rgba(37,99,235,1)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            พิมพ์ / PDF
          </button>
          {isLoading && (
            <span className="inline-flex items-center rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-600 shadow-inner">
              กำลังโหลดรายงาน...
            </span>
          )}
          {error && (
            <span className="inline-flex items-center rounded-xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-medium text-red-600 shadow-inner">
              {error}
            </span>
          )}
        </div>
      </section>

      {/* Main Table - Desktop */}
      <section className="hidden md:block rounded-xl border border-slate-200 bg-white p-4 shadow-sm overflow-x-auto">
        <table className="min-w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <th rowSpan={2} className="border border-blue-700 px-2 py-2 w-10"></th>
              <th rowSpan={2} className="border border-blue-700 px-2 py-2 text-center">SKU</th>
              <th rowSpan={2} className="border border-blue-700 px-2 py-2 text-left">สินค้า</th>
              <th colSpan={2} className="border border-blue-700 px-2 py-1 text-center bg-blue-700/20">กล่อง</th>
              <th colSpan={2} className="border border-blue-700 px-2 py-1 text-center bg-blue-700/20">แพ็ค</th>
              <th colSpan={2} className="border border-blue-700 px-2 py-1 text-center bg-blue-700/20">ปี๊บ/ซอง</th>
              <th rowSpan={2} className="border border-blue-700 px-2 py-2 text-right">รวม PC</th>
              <th rowSpan={2} className="border border-blue-700 px-2 py-2"></th>
            </tr>
            <tr className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px]">
              {/* Box */}
              <th className="border border-blue-700 px-1 py-1">จำนวน</th>
              <th className="border border-blue-700 px-1 py-1">PC</th>
              {/* Pack */}
              <th className="border border-blue-700 px-1 py-1">จำนวน</th>
              <th className="border border-blue-700 px-1 py-1">PC</th>
              {/* Piece */}
              <th className="border border-blue-700 px-1 py-1">จำนวน</th>
              <th className="border border-blue-700 px-1 py-1">PC</th>
            </tr>
          </thead>
          <tbody>
            {report.products.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-slate-500">
                  ยังไม่มีข้อมูลยอดขายตามสินค้าในช่วงที่เลือก
                </td>
              </tr>
            ) : (
              report.products.map((product) => {
                const isExpanded = expandedProducts.has(product.productKey);
                const hasStores = product.storeBreakdown && product.storeBreakdown.length > 0;

                return (
                  <React.Fragment key={product.productKey}>
                    {/* Main Product Row */}
                    <tr className="hover:bg-slate-50 bg-white font-semibold">
                      <td className="border border-slate-200 px-2 py-2 text-center">
                        {hasStores && (
                          <button
                            onClick={() => toggleExpand(product.productKey)}
                            className="inline-flex items-center justify-center rounded p-1 text-slate-600 transition hover:bg-slate-100"
                            title={isExpanded ? "ซ่อนรายละเอียด" : "แสดงรายละเอียด"}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="border border-slate-200 px-2 py-2 text-slate-800">{product.productCode || "-"}</td>
                      <td className="border border-slate-200 px-2 py-2 font-medium text-slate-900">{product.productName}</td>
                      {/* Box */}
                      <td className="border border-slate-200 px-2 py-2 text-center">{product.unitData.box.quantity || "-"}</td>
                      <td className="border border-slate-200 px-2 py-2 text-right text-emerald-700">{product.unitData.box.revenuePC > 0 ? formatShort(product.unitData.box.revenuePC) : "-"}</td>
                      {/* Pack */}
                      <td className="border border-slate-200 px-2 py-2 text-center">{product.unitData.pack.quantity || "-"}</td>
                      <td className="border border-slate-200 px-2 py-2 text-right text-emerald-700">{product.unitData.pack.revenuePC > 0 ? formatShort(product.unitData.pack.revenuePC) : "-"}</td>
                      {/* Piece */}
                      <td className="border border-slate-200 px-2 py-2 text-center">{product.unitData.piece.quantity || "-"}</td>
                      <td className="border border-slate-200 px-2 py-2 text-right text-emerald-700">{product.unitData.piece.revenuePC > 0 ? formatShort(product.unitData.piece.revenuePC) : "-"}</td>
                      {/* Totals */}
                      <td className="border border-slate-200 px-2 py-2 text-right font-bold text-emerald-700">{formatCurrency(product.totalRevenuePC)}</td>
                      <td className="border border-slate-200 px-2 py-2 text-center">
                        <button
                          onClick={() => openModal(product)}
                          className="inline-flex items-center justify-center rounded-lg p-1.5 text-blue-600 transition hover:bg-blue-50 hover:text-blue-800"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>

                    {/* Store Breakdown Rows */}
                    {isExpanded && hasStores && product.storeBreakdown.map((store) => (
                      <tr key={`${product.productKey}-${store.storeName}`} className="bg-slate-50/80 text-[11px]">
                        <td className="border border-slate-200"></td>
                        <td className="border border-slate-200 px-2 py-2 text-slate-500"></td>
                        <td className="border border-slate-200 px-2 py-2 pl-8 text-slate-600">
                          └─ 🏪 {store.storeName}
                        </td>
                        {/* Box */}
                        <td className="border border-slate-200 px-2 py-2 text-center text-slate-600">{store.unitData.box.quantity || "-"}</td>
                        <td className="border border-slate-200 px-2 py-2 text-right text-emerald-600">{store.unitData.box.revenuePC > 0 ? formatShort(store.unitData.box.revenuePC) : "-"}</td>
                        {/* Pack */}
                        <td className="border border-slate-200 px-2 py-2 text-center text-slate-600">{store.unitData.pack.quantity || "-"}</td>
                        <td className="border border-slate-200 px-2 py-2 text-right text-emerald-600">{store.unitData.pack.revenuePC > 0 ? formatShort(store.unitData.pack.revenuePC) : "-"}</td>
                        {/* Piece */}
                        <td className="border border-slate-200 px-2 py-2 text-center text-slate-600">{store.unitData.piece.quantity || "-"}</td>
                        <td className="border border-slate-200 px-2 py-2 text-right text-emerald-600">{store.unitData.piece.revenuePC > 0 ? formatShort(store.unitData.piece.revenuePC) : "-"}</td>
                        {/* Totals */}
                        <td className="border border-slate-200 px-2 py-2 text-right text-emerald-600">{formatCurrency(store.totalRevenuePC)}</td>
                        <td className="border border-slate-200"></td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
          {hasProducts && (
            <tfoot className="bg-slate-100 font-bold">
              <tr>
                <td colSpan={3} className="border border-slate-200 px-2 py-2 text-center">รวมทั้งหมด</td>
                {/* Box */}
                <td className="border border-slate-200 px-2 py-2 text-center">{report.summary.unitBreakdown.box.quantity}</td>
                <td className="border border-slate-200 px-2 py-2 text-right text-emerald-700">{formatShort(report.summary.unitBreakdown.box.revenuePC)}</td>
                {/* Pack */}
                <td className="border border-slate-200 px-2 py-2 text-center">{report.summary.unitBreakdown.pack.quantity}</td>
                <td className="border border-slate-200 px-2 py-2 text-right text-emerald-700">{formatShort(report.summary.unitBreakdown.pack.revenuePC)}</td>
                {/* Piece */}
                <td className="border border-slate-200 px-2 py-2 text-center">{report.summary.unitBreakdown.piece.quantity}</td>
                <td className="border border-slate-200 px-2 py-2 text-right text-emerald-700">{formatShort(report.summary.unitBreakdown.piece.revenuePC)}</td>
                {/* Totals */}
                <td className="border border-slate-200 px-2 py-2 text-right">{formatCurrency(report.summary.totalRevenuePC)}</td>
                <td className="border border-slate-200 px-2 py-2"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </section>

      {/* Card Layout - Mobile */}
      <section className="block md:hidden space-y-3">
        {report.products.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            ยังไม่มีข้อมูลยอดขายตามสินค้าในช่วงที่เลือก
          </div>
        ) : (
          <>
            {report.products.map((product) => {
              const isExpanded = expandedProducts.has(product.productKey);
              const hasStores = product.storeBreakdown && product.storeBreakdown.length > 0;

              return (
                <div key={product.productKey} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  {/* Product Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{product.productName}</h3>
                        <p className="text-xs text-blue-100 mt-0.5">SKU: {product.productCode || "-"}</p>
                      </div>
                      <button
                        onClick={() => openModal(product)}
                        className="flex-shrink-0 p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition"
                        title="ดูรายละเอียด"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Summary Row */}
                  <div className="p-3 bg-slate-50 border-b border-slate-200">
                    <div className="text-center">
                      <p className="text-[10px] text-slate-500 mb-0.5">รวม PC</p>
                      <p className="text-xs font-bold text-emerald-700">{formatShort(product.totalRevenuePC)}</p>
                    </div>
                  </div>

                  {/* Units Breakdown */}
                  <div className="p-3 space-y-2">
                    {/* Box */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">กล่อง</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-800">{product.unitData.box.quantity || "-"} ชิ้น</span>
                        <span className="text-emerald-600">{product.unitData.box.revenuePC > 0 ? formatShort(product.unitData.box.revenuePC) : "-"}</span>
                      </div>
                    </div>
                    {/* Pack */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">แพ็ค</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-800">{product.unitData.pack.quantity || "-"} ชิ้น</span>
                        <span className="text-emerald-600">{product.unitData.pack.revenuePC > 0 ? formatShort(product.unitData.pack.revenuePC) : "-"}</span>
                      </div>
                    </div>
                    {/* Piece */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 font-medium">ปี๊บ/ซอง</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-800">{product.unitData.piece.quantity || "-"} ชิ้น</span>
                        <span className="text-emerald-600">{product.unitData.piece.revenuePC > 0 ? formatShort(product.unitData.piece.revenuePC) : "-"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Expand/Collapse Button */}
                  {hasStores && (
                    <div className="border-t border-slate-200">
                      <button
                        onClick={() => toggleExpand(product.productKey)}
                        className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 transition"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" />
                            ซ่อนรายละเอียดร้าน
                          </>
                        ) : (
                          <>
                            <ChevronRight className="h-3.5 w-3.5" />
                            แสดงรายละเอียดร้าน ({product.storeBreakdown.length} ร้าน)
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Store Breakdown - Mobile */}
                  {isExpanded && hasStores && (
                    <div className="border-t border-slate-200 bg-slate-50/50 p-3 space-y-2">
                      {product.storeBreakdown.map((store) => (
                        <div key={`${product.productKey}-${store.storeName}`} className="bg-white rounded-lg border border-slate-200 p-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-slate-700">🏪 {store.storeName}</span>
                            <span className="text-[10px] font-medium text-emerald-600">{formatShort(store.totalRevenuePC)}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                            <div>
                              <span className="text-slate-500">กล่อง:</span>
                              <div className="font-medium text-slate-700">{store.unitData.box.quantity || "-"}</div>
                              <div className="text-emerald-600">{store.unitData.box.revenuePC > 0 ? formatShort(store.unitData.box.revenuePC) : "-"}</div>
                            </div>
                            <div>
                              <span className="text-slate-500">แพ็ค:</span>
                              <div className="font-medium text-slate-700">{store.unitData.pack.quantity || "-"}</div>
                              <div className="text-emerald-600">{store.unitData.pack.revenuePC > 0 ? formatShort(store.unitData.pack.revenuePC) : "-"}</div>
                            </div>
                            <div>
                              <span className="text-slate-500">ปี๊บ:</span>
                              <div className="font-medium text-slate-700">{store.unitData.piece.quantity || "-"}</div>
                              <div className="text-emerald-600">{store.unitData.piece.revenuePC > 0 ? formatShort(store.unitData.piece.revenuePC) : "-"}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Summary Card - Mobile */}
            <div className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-3">รวมทั้งหมด</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-2.5 border border-slate-200">
                  <p className="text-[10px] text-slate-500 mb-1">รวม PC</p>
                  <p className="text-sm font-bold text-emerald-700">{formatShort(report.summary.totalRevenuePC)}</p>
                </div>
                <div className="bg-white rounded-lg p-2.5 border border-slate-200">
                  <p className="text-[10px] text-slate-500 mb-1">จำนวนชิ้น</p>
                  <p className="text-sm font-bold text-slate-700">{formatNumber(report.summary.totalQuantity)}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Drill-Down Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeModal}>
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closeModal}
              className="absolute right-4 top-4 text-2xl text-slate-400 hover:text-slate-600"
            >
              ×
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Eye className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                {selectedProduct.productName}
              </h2>
            </div>

            {/* Product Summary */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs text-emerald-600">รวม PC</p>
                <p className="text-lg font-bold text-emerald-700">{formatCurrency(selectedProduct.totalRevenuePC)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs text-slate-600">จำนวนชิ้น</p>
                <p className="text-lg font-bold text-slate-700">{formatNumber(selectedProduct.totalQuantity)} ชิ้น</p>
              </div>
            </div>

            {/* Store Breakdown Table */}
            <h3 className="text-lg font-semibold text-slate-800 mb-3">แยกตามร้าน</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600">
                    <th className="border border-slate-200 px-3 py-2 text-left">ร้าน</th>
                    <th className="border border-slate-200 px-3 py-2 text-center">Box</th>
                    <th className="border border-slate-200 px-3 py-2 text-center">Pack</th>
                    <th className="border border-slate-200 px-3 py-2 text-center">Piece</th>
                    <th className="border border-slate-200 px-3 py-2 text-right">รวม</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedProduct.storeBreakdown.map((store) => (
                    <tr key={store.storeName} className="hover:bg-slate-50">
                      <td className="border border-slate-200 px-3 py-2 font-medium">{store.storeName}</td>
                      <td className="border border-slate-200 px-3 py-2 text-center text-xs">
                        {store.unitData.box.quantity > 0 ? (
                          <>
                            {store.unitData.box.quantity}
                            <br />
                            <span className="text-emerald-600">{formatShort(store.unitData.box.revenuePC)}</span>
                          </>
                        ) : "-"}
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-center text-xs">
                        {store.unitData.pack.quantity > 0 ? (
                          <>
                            {store.unitData.pack.quantity}
                            <br />
                            <span className="text-emerald-600">{formatShort(store.unitData.pack.revenuePC)}</span>
                          </>
                        ) : "-"}
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-center text-xs">
                        {store.unitData.piece.quantity > 0 ? (
                          <>
                            {store.unitData.piece.quantity}
                            <br />
                            <span className="text-emerald-600">{formatShort(store.unitData.piece.revenuePC)}</span>
                          </>
                        ) : "-"}
                      </td>
                      <td className="border border-slate-200 px-3 py-2 text-right font-bold">{formatCurrency(store.totalRevenuePC)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              onClick={closeModal}
              className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
            >
              ปิด
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
