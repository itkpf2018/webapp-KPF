import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import type { ProductCatalogItem } from "@/lib/supabaseProducts";

// CSV/Excel column headers
const PRODUCT_HEADERS = {
  code: "รหัสสินค้า",
  name: "ชื่อสินค้า",
  description: "คำอธิบาย",
  isActive: "สถานะใช้งาน",
  unitName: "หน่วย",
  unitSku: "SKU",
  unitIsBase: "หน่วยฐาน",
  unitMultiplier: "ตัวคูณ",
};

export type ProductImportRow = {
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  units: Array<{
    name: string;
    sku?: string;
    isBase: boolean;
    multiplierToBase: number;
  }>;
};

/**
 * Parse CSV content into product import data
 */
export function parseProductsCsv(csvContent: string): ProductImportRow[] {
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true, // Handle UTF-8 BOM
  }) as Array<Record<string, string>>;

  const productsMap = new Map<string, ProductImportRow>();

  for (const record of records) {
    const code = record[PRODUCT_HEADERS.code]?.trim();
    const name = record[PRODUCT_HEADERS.name]?.trim();
    const description = record[PRODUCT_HEADERS.description]?.trim() || undefined;
    const isActive = record[PRODUCT_HEADERS.isActive]?.trim().toLowerCase() !== "ไม่ใช้งาน";
    const unitName = record[PRODUCT_HEADERS.unitName]?.trim();
    const unitSku = record[PRODUCT_HEADERS.unitSku]?.trim() || undefined;
    const unitIsBase = record[PRODUCT_HEADERS.unitIsBase]?.trim().toLowerCase() === "ใช่";
    const unitMultiplier = parseFloat(record[PRODUCT_HEADERS.unitMultiplier] || "1");

    if (!code || !name || !unitName) {
      continue; // Skip invalid rows
    }

    let product = productsMap.get(code);
    if (!product) {
      product = {
        code,
        name,
        description,
        isActive,
        units: [],
      };
      productsMap.set(code, product);
    }

    // Add unit
    product.units.push({
      name: unitName,
      sku: unitSku,
      isBase: unitIsBase,
      multiplierToBase: unitMultiplier,
    });
  }

  return Array.from(productsMap.values());
}

/**
 * Parse Excel workbook into product import data
 */
export async function parseProductsExcel(buffer: ArrayBuffer): Promise<ProductImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    throw new Error("ไม่พบ worksheet ในไฟล์ Excel");
  }

  const productsMap = new Map<string, ProductImportRow>();

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row

    const code = row.getCell(1).text.trim();
    const name = row.getCell(2).text.trim();
    const description = row.getCell(3).text.trim() || undefined;
    const isActiveText = row.getCell(4).text.trim().toLowerCase();
    const isActive = isActiveText !== "ไม่ใช้งาน";
    const unitName = row.getCell(5).text.trim();
    const unitSku = row.getCell(6).text.trim() || undefined;
    const unitIsBaseText = row.getCell(7).text.trim().toLowerCase();
    const unitIsBase = unitIsBaseText === "ใช่";
    const unitMultiplier = parseFloat(row.getCell(8).text) || 1;

    if (!code || !name || !unitName) {
      return; // Skip invalid rows
    }

    let product = productsMap.get(code);
    if (!product) {
      product = {
        code,
        name,
        description,
        isActive,
        units: [],
      };
      productsMap.set(code, product);
    }

    // Add unit
    product.units.push({
      name: unitName,
      sku: unitSku,
      isBase: unitIsBase,
      multiplierToBase: unitMultiplier,
    });
  });

  return Array.from(productsMap.values());
}

/**
 * Export products to CSV format with UTF-8 BOM
 */
export function exportProductsCsv(products: ProductCatalogItem[]): string {
  const rows: Record<string, string | number | boolean>[] = [];

  for (const product of products) {
    for (const unit of product.units) {
      rows.push({
        [PRODUCT_HEADERS.code]: product.code,
        [PRODUCT_HEADERS.name]: product.name,
        [PRODUCT_HEADERS.description]: product.description || "",
        [PRODUCT_HEADERS.isActive]: product.isActive ? "ใช้งาน" : "ไม่ใช้งาน",
        [PRODUCT_HEADERS.unitName]: unit.name,
        [PRODUCT_HEADERS.unitSku]: unit.sku || "",
        [PRODUCT_HEADERS.unitIsBase]: unit.isBase ? "ใช่" : "ไม่ใช่",
        [PRODUCT_HEADERS.unitMultiplier]: unit.multiplierToBase,
      });
    }
  }

  // Add UTF-8 BOM prefix
  const csv = stringify(rows, {
    header: true,
    columns: Object.values(PRODUCT_HEADERS),
    bom: true,
  });

  return "\uFEFF" + csv; // UTF-8 BOM
}

/**
 * Export products to Excel format with enhanced template
 * Features:
 * - Instructions sheet with usage guide
 * - Example sheet with sample data
 * - Data validation (dropdowns) for consistent input
 * - Color-coded required fields
 * - Frozen header row and auto-filter
 * - Cell comments for guidance
 */
export async function exportProductsExcel(products: ProductCatalogItem[]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();

  // ========================================
  // Sheet 1: คำแนะนำ (Instructions)
  // ========================================
  const instructionsSheet = workbook.addWorksheet("คำแนะนำ", {
    views: [{ state: "frozen", ySplit: 0 }],
  });

  instructionsSheet.columns = [
    { width: 60 },
  ];

  // Title
  const titleRow = instructionsSheet.addRow(["📋 คำแนะนำการใช้งาน Template นำเข้าสินค้า"]);
  titleRow.font = { size: 16, bold: true, color: { argb: "FF1E40AF" } };
  titleRow.height = 30;
  instructionsSheet.mergeCells("A1:A1");

  instructionsSheet.addRow([""]);

  // Instructions content
  const instructions = [
    "🔹 วิธีการใช้งาน:",
    "  1. เปิดแผ่นงาน 'ข้อมูลสินค้า' เพื่อดูข้อมูลปัจจุบัน",
    "  2. เปิดแผ่นงาน 'ตัวอย่าง' เพื่อดูรูปแบบการกรอกข้อมูล",
    "  3. แก้ไขหรือเพิ่มข้อมูลในแผ่นงาน 'ข้อมูลสินค้า'",
    "  4. บันทึกไฟล์และอัปโหลดกลับเข้าระบบ",
    "",
    "🔹 คำอธิบายคอลัมน์:",
    "  • รหัสสินค้า (*): รหัสเฉพาะของสินค้า ห้ามซ้ำกัน (เช่น P001, COFFEE-01)",
    "  • ชื่อสินค้า (*): ชื่อเต็มของสินค้า (เช่น น้ำดื่ม, กาแฟสำเร็จรูป)",
    "  • คำอธิบาย: รายละเอียดเพิ่มเติมของสินค้า (ไม่บังคับ)",
    "  • สถานะใช้งาน (*): เลือกจาก dropdown → ใช้งาน หรือ ไม่ใช้งาน",
    "  • หน่วย (*): ชื่อหน่วยขาย (เช่น กล่อง, แพ็ค, ขวด)",
    "  • SKU: รหัส SKU ของหน่วยนั้นๆ (ไม่บังคับ)",
    "  • หน่วยฐาน (*): เลือกจาก dropdown → ใช่ (หน่วยที่เล็กที่สุด) หรือ ไม่ใช่",
    "  • ตัวคูณ (*): จำนวนหน่วยฐานใน 1 หน่วยนี้ (เช่น 1 กล่อง = 12 ขวด → ตัวคูณ = 12)",
    "",
    "🔹 หมายเหตุสำคัญ:",
    "  ⚠️ คอลัมน์ที่มีเครื่องหมาย (*) จำเป็นต้องกรอก",
    "  ⚠️ สินค้าแต่ละชนิดต้องมีหน่วยฐานเพียง 1 หน่วยเท่านั้น",
    "  ⚠️ ถ้าสินค้ามีหลายหน่วย ให้เพิ่มหลายแถวโดยใช้รหัสสินค้าเดียวกัน",
    "  ⚠️ กรุณาใช้ dropdown แทนการพิมพ์ตัวอักษรด้วยตนเอง เพื่อป้องกันข้อผิดพลาด",
    "",
    "🔹 ตัวอย่างการกรอก (สินค้าที่มี 3 หน่วย):",
    "  C001 | น้ำดื่ม | น้ำดื่มบรรจุขวด | ใช้งาน | กล่อง | BOX-001 | ไม่ใช่ | 24",
    "  C001 | น้ำดื่ม | น้ำดื่มบรรจุขวด | ใช้งาน | แพ็ค | PACK-001 | ไม่ใช่ | 6",
    "  C001 | น้ำดื่ม | น้ำดื่มบรรจุขวด | ใช้งาน | ขวด | BOTTLE-001 | ใช่ | 1",
    "",
    "💡 หากมีปัญหาหรือข้อสงสัย กรุณาติดต่อฝ่าย IT Support",
  ];

  for (const line of instructions) {
    const row = instructionsSheet.addRow([line]);
    if (line.startsWith("🔹")) {
      row.font = { bold: true, size: 12, color: { argb: "FF1E293B" } };
    } else if (line.startsWith("  •") || line.startsWith("  ⚠️")) {
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
    { header: PRODUCT_HEADERS.code, key: "code", width: 15 },
    { header: PRODUCT_HEADERS.name, key: "name", width: 30 },
    { header: PRODUCT_HEADERS.description, key: "description", width: 40 },
    { header: PRODUCT_HEADERS.isActive, key: "isActive", width: 15 },
    { header: PRODUCT_HEADERS.unitName, key: "unitName", width: 15 },
    { header: PRODUCT_HEADERS.unitSku, key: "unitSku", width: 15 },
    { header: PRODUCT_HEADERS.unitIsBase, key: "unitIsBase", width: 12 },
    { header: PRODUCT_HEADERS.unitMultiplier, key: "unitMultiplier", width: 12 },
  ];

  // Style header
  exampleSheet.getRow(1).font = { bold: true, size: 11 };
  exampleSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF3B82F6" },
  };
  exampleSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  exampleSheet.getRow(1).alignment = { horizontal: "center", vertical: "middle" };

  // Example data
  const exampleData = [
    {
      code: "C001",
      name: "น้ำดื่ม",
      description: "น้ำดื่มบรรจุขวด 600ml",
      isActive: "ใช้งาน",
      unitName: "กล่อง",
      unitSku: "BOX-001",
      unitIsBase: "ไม่ใช่",
      unitMultiplier: 24,
    },
    {
      code: "C001",
      name: "น้ำดื่ม",
      description: "น้ำดื่มบรรจุขวด 600ml",
      isActive: "ใช้งาน",
      unitName: "แพ็ค",
      unitSku: "PACK-001",
      unitIsBase: "ไม่ใช่",
      unitMultiplier: 6,
    },
    {
      code: "C001",
      name: "น้ำดื่ม",
      description: "น้ำดื่มบรรจุขวด 600ml",
      isActive: "ใช้งาน",
      unitName: "ขวด",
      unitSku: "BOTTLE-001",
      unitIsBase: "ใช่",
      unitMultiplier: 1,
    },
    {
      code: "C002",
      name: "กาแฟสำเร็จรูป",
      description: "กาแฟสำเร็จรูป 3in1",
      isActive: "ใช้งาน",
      unitName: "ลัง",
      unitSku: "CRATE-002",
      unitIsBase: "ไม่ใช่",
      unitMultiplier: 240,
    },
    {
      code: "C002",
      name: "กาแฟสำเร็จรูป",
      description: "กาแฟสำเร็จรูป 3in1",
      isActive: "ใช้งาน",
      unitName: "กล่อง",
      unitSku: "BOX-002",
      unitIsBase: "ไม่ใช่",
      unitMultiplier: 20,
    },
    {
      code: "C002",
      name: "กาแฟสำเร็จรูป",
      description: "กาแฟสำเร็จรูป 3in1",
      isActive: "ใช้งาน",
      unitName: "ซอง",
      unitSku: "SACHET-002",
      unitIsBase: "ใช่",
      unitMultiplier: 1,
    },
  ];

  for (const data of exampleData) {
    exampleSheet.addRow(data);
  }

  // Freeze header
  exampleSheet.views = [{ state: "frozen", ySplit: 1 }];

  // ========================================
  // Sheet 3: ข้อมูลสินค้า (Data)
  // ========================================
  const worksheet = workbook.addWorksheet("ข้อมูลสินค้า");

  worksheet.columns = [
    { header: PRODUCT_HEADERS.code, key: "code", width: 18 },
    { header: PRODUCT_HEADERS.name, key: "name", width: 32 },
    { header: PRODUCT_HEADERS.description, key: "description", width: 42 },
    { header: PRODUCT_HEADERS.isActive, key: "isActive", width: 15 },
    { header: PRODUCT_HEADERS.unitName, key: "unitName", width: 18 },
    { header: PRODUCT_HEADERS.unitSku, key: "unitSku", width: 18 },
    { header: PRODUCT_HEADERS.unitIsBase, key: "unitIsBase", width: 14 },
    { header: PRODUCT_HEADERS.unitMultiplier, key: "unitMultiplier", width: 14 },
  ];

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E40AF" }, // Blue
  };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 25;

  // Add cell comments to headers
  worksheet.getCell("A1").note = {
    texts: [{ text: "รหัสเฉพาะของสินค้า\nห้ามซ้ำกัน\n✅ บังคับกรอก" }],
  };
  worksheet.getCell("B1").note = {
    texts: [{ text: "ชื่อเต็มของสินค้า\n✅ บังคับกรอก" }],
  };
  worksheet.getCell("C1").note = {
    texts: [{ text: "รายละเอียดเพิ่มเติม\n⚪ ไม่บังคับ" }],
  };
  worksheet.getCell("D1").note = {
    texts: [{ text: "เลือกจาก dropdown\n✅ บังคับกรอก" }],
  };
  worksheet.getCell("E1").note = {
    texts: [{ text: "ชื่อหน่วยขาย (เช่น กล่อง, แพ็ค)\n✅ บังคับกรอก" }],
  };
  worksheet.getCell("F1").note = {
    texts: [{ text: "รหัส SKU ของหน่วย\n⚪ ไม่บังคับ" }],
  };
  worksheet.getCell("G1").note = {
    texts: [{ text: "เลือกจาก dropdown\nหน่วยฐาน = หน่วยเล็กที่สุด\n✅ บังคับกรอก" }],
  };
  worksheet.getCell("H1").note = {
    texts: [{ text: "จำนวนหน่วยฐานใน 1 หน่วยนี้\nตัวอย่าง: 1 กล่อง = 12 ขวด\n✅ บังคับกรอก" }],
  };

  // Color-code required fields (yellow background)
  const requiredColumns = [1, 2, 4, 5, 7, 8]; // A, B, D, E, G, H
  for (const colNum of requiredColumns) {
    worksheet.getColumn(colNum).eachCell((cell, rowNumber) => {
      if (rowNumber > 1) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFE082" }, // Light yellow
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
  for (const product of products) {
    for (const unit of product.units) {
      worksheet.addRow({
        code: product.code,
        name: product.name,
        description: product.description || "",
        isActive: product.isActive ? "ใช้งาน" : "ไม่ใช้งาน",
        unitName: unit.name,
        unitSku: unit.sku || "",
        unitIsBase: unit.isBase ? "ใช่" : "ไม่ใช่",
        unitMultiplier: unit.multiplierToBase,
      });
    }
  }

  // Add data validation (Dropdown) for column D (สถานะใช้งาน)
  worksheet.getColumn(4).eachCell((cell, rowNumber) => {
    if (rowNumber > 1) {
      cell.dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: ['"ใช้งาน,ไม่ใช้งาน"'],
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "ค่าไม่ถูกต้อง",
        error: "กรุณาเลือกจาก dropdown: ใช้งาน หรือ ไม่ใช้งาน",
      };
    }
  });

  // Add data validation (Dropdown) for column G (หน่วยฐาน)
  worksheet.getColumn(7).eachCell((cell, rowNumber) => {
    if (rowNumber > 1) {
      cell.dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: ['"ใช่,ไม่ใช่"'],
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "ค่าไม่ถูกต้อง",
        error: "กรุณาเลือกจาก dropdown: ใช่ หรือ ไม่ใช่",
      };
    }
  });

  // Add data validation for column H (ตัวคูณ - must be number > 0)
  worksheet.getColumn(8).eachCell((cell, rowNumber) => {
    if (rowNumber > 1) {
      cell.dataValidation = {
        type: "decimal",
        operator: "greaterThan",
        formulae: [0],
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "ค่าไม่ถูกต้อง",
        error: "ตัวคูณต้องเป็นตัวเลขที่มากกว่า 0",
      };
      cell.numFmt = "0.##"; // Number format with up to 2 decimals
    }
  });

  // Freeze header row (แถวแรก)
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  // Enable auto-filter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: 8 },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

/**
 * Validate imported products
 */
export function validateImportedProducts(products: ProductImportRow[]): string[] {
  const errors: string[] = [];

  for (const product of products) {
    // Check required fields
    if (!product.code) {
      errors.push(`สินค้า "${product.name}": ไม่มีรหัสสินค้า`);
    }
    if (!product.name) {
      errors.push(`สินค้า รหัส "${product.code}": ไม่มีชื่อสินค้า`);
    }

    // Check units
    if (product.units.length === 0) {
      errors.push(`สินค้า "${product.name}" (${product.code}): ต้องมีอย่างน้อย 1 หน่วย`);
    }

    // Check base unit
    const baseUnits = product.units.filter((u) => u.isBase);
    if (baseUnits.length === 0) {
      errors.push(`สินค้า "${product.name}" (${product.code}): ต้องมีหน่วยฐานอย่างน้อย 1 หน่วย`);
    }
    if (baseUnits.length > 1) {
      errors.push(`สินค้า "${product.name}" (${product.code}): มีหน่วยฐานเกิน 1 หน่วย`);
    }

    // Check duplicate unit names
    const unitNames = product.units.map((u) => u.name.toLowerCase());
    const uniqueNames = new Set(unitNames);
    if (unitNames.length !== uniqueNames.size) {
      errors.push(`สินค้า "${product.name}" (${product.code}): มีชื่อหน่วยซ้ำกัน`);
    }

    // Check duplicate SKUs within product
    const skus = product.units.map((u) => u.sku).filter((s) => s);
    const uniqueSkus = new Set(skus);
    if (skus.length !== uniqueSkus.size) {
      errors.push(`สินค้า "${product.name}" (${product.code}): มี SKU ซ้ำกัน`);
    }
  }

  return errors;
}
