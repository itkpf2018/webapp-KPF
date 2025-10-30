import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import type { ProductAssignment } from "@/lib/supabaseProducts";

// CSV/Excel column headers
const ASSIGNMENT_HEADERS = {
  employeeName: "ชื่อพนักงาน",
  employeeCode: "รหัสพนักงาน",
  storeName: "ร้านค้า",
  productCode: "รหัสสินค้า",
  productName: "ชื่อสินค้า",
  unitName: "หน่วย",
  unitSku: "SKU",
  pricePc: "ราคา PC",
  isActive: "สถานะใช้งาน",
};

export type AssignmentImportRow = {
  employeeName: string;
  employeeCode?: string;
  storeName?: string;
  productCode: string;
  productName: string;
  units: Array<{
    unitName: string;
    unitSku?: string;
    pricePc: number;
    isActive: boolean;
  }>;
};

export type AssignmentExportRow = {
  employeeName: string;
  employeeCode: string;
  storeName: string;
  productCode: string;
  productName: string;
  unitName: string;
  unitSku: string;
  pricePc: number;
  isActive: string;
};

/**
 * Parse CSV content into assignment import data
 */
export function parseAssignmentsCsv(csvContent: string): AssignmentImportRow[] {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true, // Handle UTF-8 BOM
  }) as Array<Record<string, string>>;

  const assignmentsMap = new Map<string, AssignmentImportRow>();

  for (const record of records) {
    const employeeName = record[ASSIGNMENT_HEADERS.employeeName]?.trim();
    const employeeCode = record[ASSIGNMENT_HEADERS.employeeCode]?.trim() || undefined;
    const storeName = record[ASSIGNMENT_HEADERS.storeName]?.trim() || undefined;
    const productCode = record[ASSIGNMENT_HEADERS.productCode]?.trim();
    const productName = record[ASSIGNMENT_HEADERS.productName]?.trim();
    const unitName = record[ASSIGNMENT_HEADERS.unitName]?.trim();
    const unitSku = record[ASSIGNMENT_HEADERS.unitSku]?.trim() || undefined;
    const pricePc = parseFloat(record[ASSIGNMENT_HEADERS.pricePc] || "0");
    const isActive = record[ASSIGNMENT_HEADERS.isActive]?.trim().toLowerCase() !== "ไม่ใช้งาน";

    if (!employeeName || !productCode || !productName || !unitName) {
      continue; // Skip invalid rows
    }

    // Create unique key for assignment
    const key = `${employeeName}|${productCode}|${storeName || ""}`;

    let assignment = assignmentsMap.get(key);
    if (!assignment) {
      assignment = {
        employeeName,
        employeeCode,
        storeName,
        productCode,
        productName,
        units: [],
      };
      assignmentsMap.set(key, assignment);
    }

    // Add unit
    assignment.units.push({
      unitName,
      unitSku,
      pricePc,
      isActive,
    });
  }

  return Array.from(assignmentsMap.values());
}

/**
 * Parse Excel workbook into assignment import data
 */
export async function parseAssignmentsExcel(buffer: ArrayBuffer): Promise<AssignmentImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    throw new Error("ไม่พบ worksheet ในไฟล์ Excel");
  }

  const assignmentsMap = new Map<string, AssignmentImportRow>();

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row

    const employeeName = row.getCell(1).text.trim();
    const employeeCode = row.getCell(2).text.trim() || undefined;
    const storeName = row.getCell(3).text.trim() || undefined;
    const productCode = row.getCell(4).text.trim();
    const productName = row.getCell(5).text.trim();
    const unitName = row.getCell(6).text.trim();
    const unitSku = row.getCell(7).text.trim() || undefined;
    const pricePc = parseFloat(row.getCell(8).text) || 0;
    const isActiveText = row.getCell(9).text.trim().toLowerCase();
    const isActive = isActiveText !== "ไม่ใช้งาน";

    if (!employeeName || !productCode || !productName || !unitName) {
      return; // Skip invalid rows
    }

    // Create unique key for assignment
    const key = `${employeeName}|${productCode}|${storeName || ""}`;

    let assignment = assignmentsMap.get(key);
    if (!assignment) {
      assignment = {
        employeeName,
        employeeCode,
        storeName,
        productCode,
        productName,
        units: [],
      };
      assignmentsMap.set(key, assignment);
    }

    // Add unit
    assignment.units.push({
      unitName,
      unitSku,
      pricePc,
      isActive,
    });
  });

  return Array.from(assignmentsMap.values());
}

/**
 * Export assignments to CSV format with UTF-8 BOM
 * Includes per-store pricing
 */
export function exportAssignmentsCsv(
  assignments: AssignmentExportRow[]
): string {
  const rows = assignments.map((assignment) => ({
    [ASSIGNMENT_HEADERS.employeeName]: assignment.employeeName,
    [ASSIGNMENT_HEADERS.employeeCode]: assignment.employeeCode || "",
    [ASSIGNMENT_HEADERS.storeName]: assignment.storeName || "ทุกร้าน",
    [ASSIGNMENT_HEADERS.productCode]: assignment.productCode,
    [ASSIGNMENT_HEADERS.productName]: assignment.productName,
    [ASSIGNMENT_HEADERS.unitName]: assignment.unitName,
    [ASSIGNMENT_HEADERS.unitSku]: assignment.unitSku || "",
    [ASSIGNMENT_HEADERS.pricePc]: assignment.pricePc,
    [ASSIGNMENT_HEADERS.isActive]: assignment.isActive,
  }));

  // Add UTF-8 BOM prefix
  const csv = stringify(rows, {
    header: true,
    columns: Object.values(ASSIGNMENT_HEADERS),
    bom: true,
  });

  return "\uFEFF" + csv; // UTF-8 BOM
}

/**
 * Export assignments to Excel format
 * Includes per-store pricing
 */
export async function exportAssignmentsExcel(
  assignments: AssignmentExportRow[]
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("การผูกสินค้า");

  // Add header row with styling
  worksheet.columns = [
    { header: ASSIGNMENT_HEADERS.employeeName, key: "employeeName", width: 20 },
    { header: ASSIGNMENT_HEADERS.employeeCode, key: "employeeCode", width: 15 },
    { header: ASSIGNMENT_HEADERS.storeName, key: "storeName", width: 25 },
    { header: ASSIGNMENT_HEADERS.productCode, key: "productCode", width: 15 },
    { header: ASSIGNMENT_HEADERS.productName, key: "productName", width: 30 },
    { header: ASSIGNMENT_HEADERS.unitName, key: "unitName", width: 15 },
    { header: ASSIGNMENT_HEADERS.unitSku, key: "unitSku", width: 15 },
    { header: ASSIGNMENT_HEADERS.pricePc, key: "pricePc", width: 12 },
    { header: ASSIGNMENT_HEADERS.isActive, key: "isActive", width: 12 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  // Add data rows
  for (const assignment of assignments) {
    worksheet.addRow({
      employeeName: assignment.employeeName,
      employeeCode: assignment.employeeCode || "",
      storeName: assignment.storeName || "ทุกร้าน",
      productCode: assignment.productCode,
      productName: assignment.productName,
      unitName: assignment.unitName,
      unitSku: assignment.unitSku || "",
      pricePc: assignment.pricePc,
      isActive: assignment.isActive,
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

/**
 * Validate imported assignments
 */
export function validateImportedAssignments(
  assignments: AssignmentImportRow[],
  existingEmployeeNames: string[],
  existingStoreNames: string[],
  existingProductCodes: string[]
): string[] {
  const errors: string[] = [];

  for (const assignment of assignments) {
    // Check employee exists
    if (!existingEmployeeNames.includes(assignment.employeeName)) {
      errors.push(
        `ไม่พบพนักงานชื่อ "${assignment.employeeName}" ในระบบ`
      );
    }

    // Check store exists (if specified)
    if (assignment.storeName && !existingStoreNames.includes(assignment.storeName)) {
      errors.push(
        `ไม่พบร้านค้าชื่อ "${assignment.storeName}" ในระบบ`
      );
    }

    // Check product exists
    if (!existingProductCodes.includes(assignment.productCode)) {
      errors.push(
        `ไม่พบสินค้ารหัส "${assignment.productCode}" ในระบบ`
      );
    }

    // Check units
    if (assignment.units.length === 0) {
      errors.push(
        `การผูกสินค้า "${assignment.productName}" สำหรับพนักงาน "${assignment.employeeName}": ต้องมีอย่างน้อย 1 หน่วย`
      );
    }

    // Check prices
    for (const unit of assignment.units) {
      if (unit.pricePc <= 0) {
        errors.push(
          `สินค้า "${assignment.productName}" หน่วย "${unit.unitName}": ราคา PC ต้องมากกว่า 0`
        );
      }
    }

    // Check duplicate unit names
    const unitNames = assignment.units.map((u) => u.unitName.toLowerCase());
    const uniqueNames = new Set(unitNames);
    if (unitNames.length !== uniqueNames.size) {
      errors.push(
        `สินค้า "${assignment.productName}" สำหรับพนักงาน "${assignment.employeeName}": มีหน่วยซ้ำกัน`
      );
    }
  }

  return errors;
}
