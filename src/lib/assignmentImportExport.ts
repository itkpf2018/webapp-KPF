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

export type MasterDataForExport = {
  employees: Array<{ name: string; code: string; stores: string }>;
  stores: Array<{ name: string; province: string }>;
  products: Array<{ code: string; name: string; units: string }>;
  allUnits: string[];
};

/**
 * Export assignments to Excel (Simple version without dropdowns/formulas)
 * Just a plain table for easy editing
 */
export async function exportAssignmentsExcelSimple(
  assignments: AssignmentExportRow[]
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("การผูกสินค้า");

  // Define columns
  worksheet.columns = [
    { header: ASSIGNMENT_HEADERS.employeeName, key: "employeeName", width: 22 },
    { header: ASSIGNMENT_HEADERS.employeeCode, key: "employeeCode", width: 16 },
    { header: ASSIGNMENT_HEADERS.storeName, key: "storeName", width: 28 },
    { header: ASSIGNMENT_HEADERS.productCode, key: "productCode", width: 16 },
    { header: ASSIGNMENT_HEADERS.productName, key: "productName", width: 32 },
    { header: ASSIGNMENT_HEADERS.unitName, key: "unitName", width: 16 },
    { header: ASSIGNMENT_HEADERS.unitSku, key: "unitSku", width: 16 },
    { header: ASSIGNMENT_HEADERS.pricePc, key: "pricePc", width: 14 },
    { header: ASSIGNMENT_HEADERS.isActive, key: "isActive", width: 15 },
  ];

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF059669" }, // Green
  };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 25;

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

  // Add borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE0E0E0" } },
        left: { style: "thin", color: { argb: "FFE0E0E0" } },
        bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
        right: { style: "thin", color: { argb: "FFE0E0E0" } },
      };
    });
  });

  // Freeze header row
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  // Auto-filter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 9 },
  };

  // Generate buffer
  return workbook.xlsx.writeBuffer();
}

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
 * Export assignments to Excel format with enhanced template
 * Features:
 * - Master Data sheet with reference data for dropdowns
 * - Instructions sheet with usage guide
 * - Example sheet with sample data
 * - Data validation (dropdowns) for consistent input
 * - XLOOKUP formulas for auto-fill employee code
 * - Color-coded required fields
 * - Frozen header row and auto-filter
 * - Cell comments for guidance
 * Includes per-store pricing
 */
export async function exportAssignmentsExcel(
  assignments: AssignmentExportRow[],
  masterData?: MasterDataForExport
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();

  // ========================================
  // Sheet 1: ข้อมูลอ้างอิง (Master Data) - For Dropdowns
  // ========================================
  if (masterData) {
    const masterSheet = workbook.addWorksheet("ข้อมูลอ้างอิง");

    // Configure columns
    masterSheet.columns = [
      { width: 25 }, // A: Employee names
      { width: 15 }, // B: Employee codes
      { width: 40 }, // C: Employee stores
      { width: 5 },  // D: Empty separator
      { width: 25 }, // E: Store names
      { width: 15 }, // F: Store provinces
      { width: 5 },  // G: Empty separator
      { width: 15 }, // H: Product codes
      { width: 30 }, // I: Product names
      { width: 25 }, // J: Product units
      { width: 5 },  // K: Empty separator
      { width: 15 }, // L: All units
    ];

    // Header row with styling
    const headerRow = masterSheet.addRow([
      "ชื่อพนักงาน",
      "รหัสพนักงาน",
      "ร้านที่ผูก",
      "",
      "ชื่อร้าน",
      "จังหวัด",
      "",
      "รหัสสินค้า",
      "ชื่อสินค้า",
      "หน่วยทั้งหมด",
      "",
      "หน่วย",
    ]);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF6366F1" }, // Indigo
    };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    headerRow.height = 25;

    // Add employee data
    const maxRows = Math.max(
      masterData.employees.length,
      masterData.stores.length,
      masterData.products.length,
      masterData.allUnits.length
    );

    for (let i = 0; i < maxRows; i++) {
      const employee = masterData.employees[i];
      const store = masterData.stores[i];
      const product = masterData.products[i];
      const unit = masterData.allUnits[i];

      masterSheet.addRow([
        employee?.name || "",
        employee?.code || "",
        employee?.stores || "",
        "",
        store?.name || "",
        store?.province || "",
        "",
        product?.code || "",
        product?.name || "",
        product?.units || "",
        "",
        unit || "",
      ]);
    }

    // Style separator columns
    for (const colNum of [4, 7, 11]) {
      masterSheet.getColumn(colNum).eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE5E7EB" },
        };
      });
    }

    // Freeze header row
    masterSheet.views = [{ state: "frozen", ySplit: 1 }];

    // Add note explaining this sheet
    masterSheet.getCell("A1").note = {
      texts: [{ text: "แผ่นงานนี้เป็นข้อมูลอ้างอิงสำหรับ dropdown\nไม่ต้องแก้ไขข้อมูลในแผ่นงานนี้" }],
    };
  }

  // ========================================
  // Sheet 2: คำแนะนำ (Instructions)
  // ========================================
  const instructionsSheet = workbook.addWorksheet("คำแนะนำ", {
    views: [{ state: "frozen", ySplit: 0 }],
  });

  instructionsSheet.columns = [
    { width: 60 },
  ];

  // Title
  const titleRow = instructionsSheet.addRow(["📋 คำแนะนำการใช้งาน Template นำเข้าการผูกสินค้า"]);
  titleRow.font = { size: 16, bold: true, color: { argb: "FF059669" } };
  titleRow.height = 30;
  instructionsSheet.mergeCells("A1:A1");

  instructionsSheet.addRow([""]);

  // Instructions content
  const instructions = [
    "🔹 วิธีการใช้งาน:",
    "  1. เปิดแผ่นงาน 'การผูกสินค้า' เพื่อดูข้อมูลปัจจุบัน",
    "  2. เปิดแผ่นงาน 'ตัวอย่าง' เพื่อดูรูปแบบการกรอกข้อมูล",
    "  3. แก้ไขหรือเพิ่มข้อมูลในแผ่นงาน 'การผูกสินค้า'",
    "  4. บันทึกไฟล์และอัปโหลดกลับเข้าระบบ",
    "",
    "🔹 คำอธิบายคอลัมน์:",
    "  • ชื่อพนักงาน (*): เลือกจาก dropdown (ดึงจากข้อมูลพนักงานในระบบ)",
    "  • รหัสพนักงาน: ❗ กรอกอัตโนมัติเมื่อเลือกชื่อพนักงาน (ใช้ XLOOKUP formula)",
    "  • ร้านค้า: เลือกจาก dropdown (ดึงจากข้อมูลร้านในระบบ) ⚠️ เลือกเฉพาะร้านที่พนักงานผูกอยู่",
    "  • รหัสสินค้า (*): พิมพ์รหัสสินค้าที่ต้องการผูก (ดูได้จากแผ่น 'ข้อมูลอ้างอิง')",
    "  • ชื่อสินค้า (*): เลือกจาก dropdown (ดึงจากข้อมูลสินค้าในระบบ)",
    "  • หน่วย (*): เลือกจาก dropdown ⚠️ เลือกเฉพาะหน่วยที่สินค้านั้นมี",
    "  • SKU: พิมพ์รหัส SKU ของหน่วยนั้น (ไม่บังคับ)",
    "  • ราคา PC (*): พิมพ์ราคาขายต่อหน่วย (บาท) ต้องมากกว่า 0",
    "  • สถานะใช้งาน (*): เลือกจาก dropdown → ใช้งาน หรือ ไม่ใช้งาน",
    "",
    "🔹 การใช้งาน Dropdown และ Auto-fill:",
    "  ✅ ชื่อพนักงาน → เลือกจาก dropdown → รหัสพนักงานกรอกอัตโนมัติ",
    "  ✅ ร้านค้า → เลือกจาก dropdown → ต้องเป็นร้านที่พนักงานผูกอยู่ (ดูได้จากคอลัมน 'ร้านที่ผูก' ใน 'ข้อมูลอ้างอิง')",
    "  ✅ ชื่อสินค้า → เลือกจาก dropdown → ดูหน่วยที่มีได้จากคอลัมน 'หน่วยทั้งหมด' ใน 'ข้อมูลอ้างอิง'",
    "  ✅ หน่วย → เลือกจาก dropdown → ต้องเป็นหน่วยที่สินค้านั้นมี",
    "",
    "🔹 หมายเหตุสำคัญ:",
    "  ⚠️ คอลัมน์ที่มีเครื่องหมาย (*) จำเป็นต้องกรอก",
    "  ⚠️ พนักงาน, ร้านค้า, และสินค้า ต้องมีในระบบก่อน ถึงจะผูกได้",
    "  ⚠️ ถ้าสินค้ามีหลายหน่วย ให้เพิ่มหลายแถวโดยใช้ชื่อพนักงานและรหัสสินค้าเดียวกัน",
    "  ⚠️ ราคา PC สามารถแตกต่างกันได้ตามพนักงานและร้าน",
    "  ⚠️ ตรวจสอบข้อมูลอ้างอิงในแผ่น 'ข้อมูลอ้างอิง' เพื่อดูรายการพนักงาน, ร้าน, สินค้า และหน่วยทั้งหมด",
    "",
    "🔹 ตัวอย่างการกรอก:",
    "  1. เลือก 'สมชาย ใจดี' จาก dropdown ชื่อพนักงาน → รหัส 'E001' กรอกอัตโนมัติ",
    "  2. เลือก 'ร้านเซเว่นสาขา1' จาก dropdown ร้านค้า (ต้องเป็นร้านที่สมชายผูกอยู่)",
    "  3. พิมพ์ 'C001' ในช่องรหัสสินค้า",
    "  4. เลือก 'น้ำดื่ม' จาก dropdown ชื่อสินค้า",
    "  5. เลือก 'กล่อง' จาก dropdown หน่วย (ต้องเป็นหน่วยที่น้ำดื่มมี)",
    "  6. พิมพ์ 'BOX-001' ในช่อง SKU (ถ้ามี)",
    "  7. พิมพ์ '240' ในช่องราคา PC",
    "  8. เลือก 'ใช้งาน' จาก dropdown สถานะ",
    "",
    "💡 หากมีปัญหาหรือข้อสงสัย กรุณาติดต่อฝ่าย IT Support",
  ];

  for (const line of instructions) {
    const row = instructionsSheet.addRow([line]);
    if (line.startsWith("🔹")) {
      row.font = { bold: true, size: 12, color: { argb: "FF1E293B" } };
    } else if (line.startsWith("  •") || line.startsWith("  ⚠️") || line.startsWith("  💡")) {
      row.font = { size: 11, color: { argb: "FF475569" } };
    } else {
      row.font = { size: 10, color: { argb: "FF64748B" } };
    }
    row.alignment = { wrapText: true, vertical: "top" };
  }

  // ========================================
  // Sheet 2: ตัวอย่าง (Example)
  // ========================================
  const exampleSheet = workbook.addWorksheet("ตัวอย่าง");

  exampleSheet.columns = [
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

  // Style header
  exampleSheet.getRow(1).font = { bold: true, size: 11 };
  exampleSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF10B981" },
  };
  exampleSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  exampleSheet.getRow(1).alignment = { horizontal: "center", vertical: "middle" };

  // Example data
  const exampleData = [
    {
      employeeName: "สมชาย ใจดี",
      employeeCode: "E001",
      storeName: "ร้านเซเว่นสาขา1",
      productCode: "C001",
      productName: "น้ำดื่ม",
      unitName: "กล่อง",
      unitSku: "BOX-001",
      pricePc: 240,
      isActive: "ใช้งาน",
    },
    {
      employeeName: "สมชาย ใจดี",
      employeeCode: "E001",
      storeName: "ร้านเซเว่นสาขา1",
      productCode: "C001",
      productName: "น้ำดื่ม",
      unitName: "แพ็ค",
      unitSku: "PACK-001",
      pricePc: 20,
      isActive: "ใช้งาน",
    },
    {
      employeeName: "สมหญิง รักงาน",
      employeeCode: "E002",
      storeName: "ทุกร้าน",
      productCode: "C002",
      productName: "กาแฟสำเร็จรูป",
      unitName: "ลัง",
      unitSku: "CRATE-002",
      pricePc: 2400,
      isActive: "ใช้งาน",
    },
    {
      employeeName: "สมหญิง รักงาน",
      employeeCode: "E002",
      storeName: "ทุกร้าน",
      productCode: "C002",
      productName: "กาแฟสำเร็จรูป",
      unitName: "กล่อง",
      unitSku: "BOX-002",
      pricePc: 200,
      isActive: "ใช้งาน",
    },
    {
      employeeName: "สมหญิง รักงาน",
      employeeCode: "E002",
      storeName: "ทุกร้าน",
      productCode: "C002",
      productName: "กาแฟสำเร็จรูป",
      unitName: "ซอง",
      unitSku: "SACHET-002",
      pricePc: 10,
      isActive: "ใช้งาน",
    },
  ];

  for (const data of exampleData) {
    exampleSheet.addRow(data);
  }

  // Freeze header
  exampleSheet.views = [{ state: "frozen", ySplit: 1 }];

  // ========================================
  // Sheet 3: การผูกสินค้า (Data)
  // ========================================
  const worksheet = workbook.addWorksheet("การผูกสินค้า");

  worksheet.columns = [
    { header: ASSIGNMENT_HEADERS.employeeName, key: "employeeName", width: 22 },
    { header: ASSIGNMENT_HEADERS.employeeCode, key: "employeeCode", width: 16 },
    { header: ASSIGNMENT_HEADERS.storeName, key: "storeName", width: 28 },
    { header: ASSIGNMENT_HEADERS.productCode, key: "productCode", width: 16 },
    { header: ASSIGNMENT_HEADERS.productName, key: "productName", width: 32 },
    { header: ASSIGNMENT_HEADERS.unitName, key: "unitName", width: 16 },
    { header: ASSIGNMENT_HEADERS.unitSku, key: "unitSku", width: 16 },
    { header: ASSIGNMENT_HEADERS.pricePc, key: "pricePc", width: 14 },
    { header: ASSIGNMENT_HEADERS.isActive, key: "isActive", width: 15 },
  ];

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF059669" }, // Green
  };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 25;

  // Add cell comments to headers
  worksheet.getCell("A1").note = {
    texts: [{ text: "เลือกชื่อพนักงานจาก dropdown\nข้อมูลมาจากแผ่น 'ข้อมูลอ้างอิง'\n✅ บังคับกรอก" }],
  };
  worksheet.getCell("B1").note = {
    texts: [{ text: "❗ กรอกอัตโนมัติจาก XLOOKUP formula\nไม่ต้องพิมพ์เอง\n⚪ ไม่บังคับ" }],
  };
  worksheet.getCell("C1").note = {
    texts: [{ text: "เลือกร้านจาก dropdown\nต้องเป็นร้านที่พนักงานผูกอยู่\n⚪ ไม่บังคับ (เว้นว่าง = ทุกร้าน)" }],
  };
  worksheet.getCell("D1").note = {
    texts: [{ text: "พิมพ์รหัสสินค้า\nดูได้จากแผ่น 'ข้อมูลอ้างอิง'\n✅ บังคับกรอก" }],
  };
  worksheet.getCell("E1").note = {
    texts: [{ text: "เลือกชื่อสินค้าจาก dropdown\nข้อมูลมาจากแผ่น 'ข้อมูลอ้างอิง'\n✅ บังคับกรอก" }],
  };
  worksheet.getCell("F1").note = {
    texts: [{ text: "เลือกหน่วยจาก dropdown\nต้องเป็นหน่วยที่สินค้านั้นมี\n✅ บังคับกรอก" }],
  };
  worksheet.getCell("G1").note = {
    texts: [{ text: "พิมพ์รหัส SKU ของหน่วย\n⚪ ไม่บังคับ" }],
  };
  worksheet.getCell("H1").note = {
    texts: [{ text: "พิมพ์ราคาขายต่อหน่วย (บาท)\nต้องมากกว่า 0\n✅ บังคับกรอก" }],
  };
  worksheet.getCell("I1").note = {
    texts: [{ text: "เลือกจาก dropdown\nใช้งาน หรือ ไม่ใช้งาน\n✅ บังคับกรอก" }],
  };

  // Color-code required fields (yellow background)
  const requiredColumns = [1, 4, 5, 6, 8, 9]; // A, D, E, F, H, I
  for (const colNum of requiredColumns) {
    worksheet.getColumn(colNum).eachCell((cell, rowNumber) => {
      if (rowNumber > 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFBEF264" }, // Light green-yellow
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFE0E0E0" } },
          left: { style: "thin", color: { argb: "FFE0E0E0" } },
          bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
          right: { style: "thin", color: { argb: "FFE0E0E0" } },
        };
      }
    });
  }

  // Add existing data rows
  for (const assignment of assignments) {
    const rowIndex = worksheet.rowCount + 1;
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

    // If masterData exists, add XLOOKUP formula for employee code (column B)
    if (masterData && masterData.employees.length > 0) {
      const cellB = worksheet.getCell(`B${rowIndex}`);
      // XLOOKUP: lookup employee name (A) in master data column A, return column B
      const maxRow = masterData.employees.length + 1; // +1 for header
      cellB.value = {
        formula: `XLOOKUP(A${rowIndex},ข้อมูลอ้างอิง!$A$2:$A$${maxRow},ข้อมูลอ้างอิง!$B$2:$B$${maxRow},"")`,
        result: assignment.employeeCode || "",
      };
    }
  }

  // Add 50 empty rows for new data entry
  const emptyRowsToAdd = 50;
  for (let i = 0; i < emptyRowsToAdd; i++) {
    const rowIndex = worksheet.rowCount + 1;
    worksheet.addRow({
      employeeName: "",
      employeeCode: "",
      storeName: "",
      productCode: "",
      productName: "",
      unitName: "",
      unitSku: "",
      pricePc: "",
      isActive: "ใช้งาน",
    });

    // Add XLOOKUP formula for employee code in empty rows too
    if (masterData && masterData.employees.length > 0) {
      const cellB = worksheet.getCell(`B${rowIndex}`);
      const maxRow = masterData.employees.length + 1;
      cellB.value = {
        formula: `XLOOKUP(A${rowIndex},ข้อมูลอ้างอิง!$A$2:$A$${maxRow},ข้อมูลอ้างอิง!$B$2:$B$${maxRow},"")`,
        result: "",
      };
    }
  }

  // Add data validation with dropdowns referencing Master Data sheet
  if (masterData) {
    const employeeMaxRow = masterData.employees.length + 1;
    const storeMaxRow = masterData.stores.length + 1;
    const productMaxRow = masterData.products.length + 1;
    const unitMaxRow = masterData.allUnits.length + 1;
    const lastDataRow = worksheet.rowCount; // Total rows including empty rows

    // Column A: Employee Name dropdown
    for (let rowNumber = 2; rowNumber <= lastDataRow; rowNumber++) {
      worksheet.getCell(`A${rowNumber}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [`ข้อมูลอ้างอิง!$A$2:$A$${employeeMaxRow}`],
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "ค่าไม่ถูกต้อง",
        error: "กรุณาเลือกชื่อพนักงานจาก dropdown",
      };
    }

    // Column C: Store Name dropdown
    for (let rowNumber = 2; rowNumber <= lastDataRow; rowNumber++) {
      worksheet.getCell(`C${rowNumber}`).dataValidation = {
        type: "list",
        allowBlank: true, // Can be blank (= all stores)
        formulae: [`ข้อมูลอ้างอิง!$E$2:$E$${storeMaxRow}`],
        showErrorMessage: true,
        errorStyle: "warning",
        errorTitle: "คำเตือน",
        error: "กรุณาเลือกร้านจาก dropdown หรือเว้นว่างสำหรับทุกร้าน",
      };
    }

    // Column E: Product Name dropdown
    for (let rowNumber = 2; rowNumber <= lastDataRow; rowNumber++) {
      worksheet.getCell(`E${rowNumber}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [`ข้อมูลอ้างอิง!$I$2:$I$${productMaxRow}`],
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "ค่าไม่ถูกต้อง",
        error: "กรุณาเลือกชื่อสินค้าจาก dropdown",
      };
    }

    // Column F: Unit dropdown
    for (let rowNumber = 2; rowNumber <= lastDataRow; rowNumber++) {
      worksheet.getCell(`F${rowNumber}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [`ข้อมูลอ้างอิง!$L$2:$L$${unitMaxRow}`],
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "ค่าไม่ถูกต้อง",
        error: "กรุณาเลือกหน่วยจาก dropdown (ต้องตรงกับสินค้าที่เลือก)",
      };
    }
  }

  // Column H: Price PC validation (must be number > 0)
  const lastDataRow = worksheet.rowCount;
  for (let rowNumber = 2; rowNumber <= lastDataRow; rowNumber++) {
    const cell = worksheet.getCell(`H${rowNumber}`);
    cell.dataValidation = {
      type: "decimal",
      operator: "greaterThan",
      formulae: [0],
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "ค่าไม่ถูกต้อง",
      error: "ราคา PC ต้องเป็นตัวเลขที่มากกว่า 0",
    };
    cell.numFmt = "0.00"; // Number format with 2 decimals
  }

  // Column I: Status dropdown (ใช้งาน / ไม่ใช้งาน)
  for (let rowNumber = 2; rowNumber <= lastDataRow; rowNumber++) {
    worksheet.getCell(`I${rowNumber}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ['"ใช้งาน,ไม่ใช้งาน"'],
      showErrorMessage: true,
      errorStyle: "error",
      errorTitle: "ค่าไม่ถูกต้อง",
      error: "กรุณาเลือกจาก dropdown: ใช้งาน หรือ ไม่ใช้งาน",
    };
  }

  // Freeze header row (แถวแรก)
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  // Enable auto-filter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 9 },
  };

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
