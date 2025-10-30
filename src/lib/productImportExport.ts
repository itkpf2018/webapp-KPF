import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import type { ProductCatalogItem, ProductUnit } from "@/lib/supabaseProducts";

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
 * Export products to Excel format
 */
export async function exportProductsExcel(products: ProductCatalogItem[]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("สินค้า");

  // Add header row with styling
  worksheet.columns = [
    { header: PRODUCT_HEADERS.code, key: "code", width: 15 },
    { header: PRODUCT_HEADERS.name, key: "name", width: 30 },
    { header: PRODUCT_HEADERS.description, key: "description", width: 40 },
    { header: PRODUCT_HEADERS.isActive, key: "isActive", width: 12 },
    { header: PRODUCT_HEADERS.unitName, key: "unitName", width: 15 },
    { header: PRODUCT_HEADERS.unitSku, key: "unitSku", width: 15 },
    { header: PRODUCT_HEADERS.unitIsBase, key: "unitIsBase", width: 12 },
    { header: PRODUCT_HEADERS.unitMultiplier, key: "unitMultiplier", width: 12 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  };

  // Add data rows
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
