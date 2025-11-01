"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Edit,
  Package,
  ShoppingBag,
  Download,
  Upload,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import clsx from "clsx";

import type {
  ProductAssignment,
  ProductCatalogItem,
  UpsertAssignmentInput,
  UpsertProductCatalogInput,
} from "@/lib/supabaseProducts";
import ImportModal from "@/components/ImportModal";

type EmployeeOption = {
  id: string;
  name: string;
  defaultStoreId?: string | null;
  storeIds?: string[]; // Store IDs that this employee is assigned to
};

type StoreOption = {
  id: string;
  name: string;
  province?: string | null;
};

type CatalogUnitForm = {
  id?: string;
  name: string;
  sku: string;
  multiplierToBase: string;
  isBase: boolean;
};

type CatalogFormState = {
  id?: string;
  code: string;
  name: string;
  description: string;
  isActive: boolean;
  units: CatalogUnitForm[];
};

type AssignmentUnitForm = {
  unitId: string;
  unitName: string;
  multiplierToBase: number;
  pricePc: string;
  enabled: boolean;
};

// Quick Add Row Type
type QuickAddUnitForm = {
  tempUnitId: string;
  name: string;
  sku: string;
  isBase: boolean;
  multiplierToBase: string;
};

type QuickAddRow = {
  tempId: string;
  code: string;
  name: string;
  description: string;
  units: QuickAddUnitForm[];
  showUnits: boolean; // for expand/collapse
};

const emptyCatalogForm = (): CatalogFormState => ({
  code: "",
  name: "",
  description: "",
  isActive: true,
  units: [
    {
      id: undefined,
      name: "ซอง",
      sku: "",
      multiplierToBase: "1",
      isBase: true,
    },
  ],
});

const emptyQuickAddRow = (): QuickAddRow => ({
  tempId: Math.random().toString(36).substring(7),
  code: "",
  name: "",
  description: "",
  units: [
    {
      tempUnitId: Math.random().toString(36).substring(7),
      name: "ซอง",
      sku: "",
      isBase: true,
      multiplierToBase: "1",
    },
  ],
  showUnits: false,
});

const currencyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) {
    return "-";
  }
  return currencyFormatter.format(value).replace("฿", "฿ ");
}

export default function ProductsPage() {
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogSuccess, setCatalogSuccess] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<ProductCatalogItem[]>([]);
  const [catalogForm, setCatalogForm] = useState<CatalogFormState>(emptyCatalogForm());
  const [isSavingCatalog, setIsSavingCatalog] = useState(false);

  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [assignments, setAssignments] = useState<ProductAssignment[]>([]);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [assignmentSuccess, setAssignmentSuccess] = useState<string | null>(null);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [assignmentUnits, setAssignmentUnits] = useState<AssignmentUnitForm[]>([]);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportAssignmentsModalOpen, setIsImportAssignmentsModalOpen] = useState(false);

  // Search, Filter, Pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Bulk selection
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // Quick Add Mode
  const [isQuickAddMode, setIsQuickAddMode] = useState(false);
  const [quickAddRows, setQuickAddRows] = useState<QuickAddRow[]>([emptyQuickAddRow()]);
  const [isSavingQuickAdd, setIsSavingQuickAdd] = useState(false);

  useEffect(() => {
    void Promise.all([loadCatalog(), loadEmployees(), loadStores()]);
  }, []);

  // Auto-select store if employee has only one store assigned
  useEffect(() => {
    if (!selectedEmployeeId) {
      return;
    }

    const employee = employees.find(emp => emp.id === selectedEmployeeId);
    if (employee && employee.storeIds && employee.storeIds.length === 1) {
      // Employee has exactly one store - auto-select it
      setSelectedStoreId(employee.storeIds[0]);
    } else {
      // Employee has multiple stores or none - reset to "all stores"
      setSelectedStoreId("");
    }
  }, [selectedEmployeeId, employees]);

  useEffect(() => {
    if (!selectedEmployeeId) {
      setAssignments([]);
      setAssignmentUnits([]);
      return;
    }
    void loadAssignments(selectedEmployeeId, selectedStoreId);
  }, [selectedEmployeeId, selectedStoreId]);

  useEffect(() => {
    if (!selectedProductId) {
      setAssignmentUnits([]);
      return;
    }
    const product = catalog.find((item) => item.id === selectedProductId);
    if (!product) {
      setAssignmentUnits([]);
      return;
    }
    const existing = assignments.find((item) => item.productId === selectedProductId);
    setAssignmentUnits(
      product.units.map((unit) => {
        const current = existing?.units.find((entry) => entry.unitId === unit.id);
        return {
          unitId: unit.id,
          unitName: unit.name,
          multiplierToBase: unit.multiplierToBase,
          pricePc: current && current.pricePc > 0 ? current.pricePc.toString() : "",
          enabled: Boolean(current?.isActive),
        };
      }),
    );
  }, [selectedProductId, catalog, assignments]);

  useEffect(() => {
    if (!catalogSuccess && !assignmentSuccess) {
      return;
    }
    const timer = window.setTimeout(() => {
      setCatalogSuccess(null);
      setAssignmentSuccess(null);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [catalogSuccess, assignmentSuccess]);

  // Reset to page 1 when search/filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  async function loadCatalog(): Promise<void> {
    setIsLoadingCatalog(true);
    setCatalogError(null);
    try {
      const response = await fetch("/api/admin/products/catalog");
      if (!response.ok) {
        throw new Error("ไม่สามารถดึงข้อมูลรายการสินค้าได้");
      }
      const data = (await response.json()) as { products?: ProductCatalogItem[] };
      setCatalog(data.products ?? []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ไม่สามารถดึงข้อมูลรายการสินค้าได้";
      setCatalogError(message);
      setCatalog([]);
    } finally {
      setIsLoadingCatalog(false);
    }
  }

  async function loadEmployees(): Promise<void> {
    try {
      const response = await fetch("/api/admin/employees");
      if (!response.ok) {
        throw new Error("ไม่สามารถดึงข้อมูลพนักงานได้");
      }
      const data = (await response.json()) as { employees?: EmployeeOption[] };
      setEmployees(data.employees ?? []);
    } catch (error) {
      console.error(error);
      setEmployees([]);
    }
  }

  async function loadStores(): Promise<void> {
    try {
      const response = await fetch("/api/admin/stores");
      if (!response.ok) {
        throw new Error("ไม่สามารถดึงข้อมูลร้านค้าได้");
      }
      const data = (await response.json()) as { stores?: StoreOption[] };
      setStores(data.stores ?? []);
    } catch (error) {
      console.error(error);
      setStores([]);
    }
  }

  async function loadAssignments(employeeId: string, storeId: string): Promise<void> {
    setAssignmentsLoading(true);
    setAssignmentError(null);
    try {
      const params = new URLSearchParams({ employeeId });
      if (storeId) {
        params.set("storeId", storeId);
      }
      const response = await fetch("/api/admin/products/assignments?" + params.toString());
      if (!response.ok) {
        throw new Error("ไม่สามารถดึงข้อมูลการผูกสินค้าได้");
      }
      const data = (await response.json()) as { assignments?: ProductAssignment[] };
      setAssignments(data.assignments ?? []);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ไม่สามารถดึงข้อมูลการผูกสินค้าได้";
      setAssignments([]);
      setAssignmentError(message);
    } finally {
      setAssignmentsLoading(false);
    }
  }

  function handleAddCatalogUnit(): void {
    setCatalogForm((prev) => {
      const nextUnits = [...prev.units];
      const hasBase = nextUnits.some((unit) => unit.isBase);
      nextUnits.push({
        id: undefined,
        name: "",
        sku: "",
        multiplierToBase: "1",
        isBase: !hasBase,
      });
      return { ...prev, units: nextUnits };
    });
  }

  function handleUpdateCatalogUnit(index: number, update: Partial<CatalogUnitForm>): void {
    setCatalogForm((prev) => {
      const nextUnits = prev.units.map((unit, unitIndex) =>
        unitIndex === index ? { ...unit, ...update } : unit,
      );
      if (update.isBase) {
        return {
          ...prev,
          units: nextUnits.map((unit, unitIndex) => ({
            ...unit,
            isBase: unitIndex === index,
            multiplierToBase: unitIndex === index ? "1" : unit.multiplierToBase,
          })),
        };
      }
      return { ...prev, units: nextUnits };
    });
  }

  function handleRemoveCatalogUnit(index: number): void {
    setCatalogForm((prev) => {
      if (prev.units.length <= 1) {
        return prev;
      }
      const nextUnits = prev.units.filter((_, unitIndex) => unitIndex !== index);
      if (!nextUnits.some((unit) => unit.isBase)) {
        nextUnits[0] = { ...nextUnits[0], isBase: true, multiplierToBase: "1" };
      }
      return { ...prev, units: nextUnits };
    });
  }

  function resetCatalogForm(): void {
    setCatalogForm(emptyCatalogForm());
    setCatalogError(null);
    setCatalogSuccess(null);
  }

  async function submitCatalogForm(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isSavingCatalog) {
      return;
    }
    setIsSavingCatalog(true);
    setCatalogError(null);
    try {
      const payload: UpsertProductCatalogInput = {
        id: catalogForm.id,
        code: catalogForm.code.trim(),
        name: catalogForm.name.trim(),
        description: catalogForm.description.trim() || null,
        isActive: catalogForm.isActive,
        units: catalogForm.units.map((unit) => ({
          id: unit.id,
          name: unit.name.trim(),
          sku: unit.sku.trim() || null,
          isBase: unit.isBase,
          multiplierToBase: Number(unit.isBase ? "1" : unit.multiplierToBase || "0"),
        })),
      };

      const response = await fetch("/api/admin/products/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "ไม่สามารถบันทึกข้อมูลสินค้าได้");
      }

      await loadCatalog();
      setCatalogSuccess(payload.id ? "บันทึกสินค้าเรียบร้อย" : "เพิ่มสินค้าเรียบร้อย");
      setCatalogForm(emptyCatalogForm());
    } catch (error) {
      const message = error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลสินค้าได้";
      setCatalogError(message);
    } finally {
      setIsSavingCatalog(false);
    }
  }

  function handleEditCatalog(product: ProductCatalogItem): void {
    setCatalogForm({
      id: product.id,
      code: product.code,
      name: product.name,
      description: product.description ?? "",
      isActive: product.isActive,
      units: product.units.map((unit) => ({
        id: unit.id,
        name: unit.name,
        sku: unit.sku ?? "",
        multiplierToBase: String(unit.multiplierToBase),
        isBase: unit.isBase,
      })),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDeleteCatalog(productId: string): Promise<void> {
    if (!window.confirm("⚠️ การลบสินค้านี้จะลบการผูกสินค้ากับพนักงานทั้งหมด\n\nต้องการดำเนินการต่อหรือไม่?")) {
      return;
    }

    setCatalogError(null);
    try {
      const response = await fetch("/api/admin/products/catalog", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productId }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "ไม่สามารถลบสินค้าได้");
      }

      await loadCatalog();
      setCatalogSuccess("ลบสินค้าเรียบร้อย");

      if (catalogForm.id === productId) {
        setCatalogForm(emptyCatalogForm());
      }

      // Remove from selection
      setSelectedProducts((prev) => {
        const updated = new Set(prev);
        updated.delete(productId);
        return updated;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "ไม่สามารถลบสินค้าได้";
      setCatalogError(message);
    }
  }

  // Bulk delete
  async function handleBulkDelete(): Promise<void> {
    if (selectedProducts.size === 0) {
      setCatalogError("กรุณาเลือกสินค้าที่ต้องการลบ");
      return;
    }

    if (!window.confirm(`⚠️ ต้องการลบสินค้า ${selectedProducts.size} รายการหรือไม่?\n\nการลบจะมีผลทันที และไม่สามารถกู้คืนได้`)) {
      return;
    }

    setCatalogError(null);
    setCatalogSuccess(null);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const productId of selectedProducts) {
      try {
        const response = await fetch("/api/admin/products/catalog", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: productId }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.message ?? "ลบไม่สำเร็จ");
        }

        successCount++;
      } catch (error) {
        failCount++;
        const productName = catalog.find((p) => p.id === productId)?.name ?? productId;
        errors.push(`${productName}: ${error instanceof Error ? error.message : "ลบไม่สำเร็จ"}`);
      }
    }

    await loadCatalog();
    setSelectedProducts(new Set());

    if (failCount === 0) {
      setCatalogSuccess(`ลบสินค้าสำเร็จ ${successCount} รายการ`);
    } else {
      setCatalogError(`ลบสำเร็จ ${successCount} รายการ, ล้มเหลว ${failCount} รายการ:\n${errors.join("\n")}`);
    }
  }

  // Quick Add handlers
  function addQuickAddRow(): void {
    setQuickAddRows((prev) => [...prev, emptyQuickAddRow()]);
  }

  function removeQuickAddRow(tempId: string): void {
    if (quickAddRows.length === 1) return;
    setQuickAddRows((prev) => prev.filter((row) => row.tempId !== tempId));
  }

  function updateQuickAddRow(tempId: string, field: keyof Omit<QuickAddRow, 'units' | 'showUnits'>, value: string): void {
    setQuickAddRows((prev) =>
      prev.map((row) =>
        row.tempId === tempId ? { ...row, [field]: value } : row
      )
    );
  }

  function toggleShowUnits(tempId: string): void {
    setQuickAddRows((prev) =>
      prev.map((row) =>
        row.tempId === tempId ? { ...row, showUnits: !row.showUnits } : row
      )
    );
  }

  function addQuickAddUnit(tempId: string): void {
    setQuickAddRows((prev) =>
      prev.map((row) => {
        if (row.tempId !== tempId) return row;
        const hasBase = row.units.some((u) => u.isBase);
        return {
          ...row,
          units: [
            ...row.units,
            {
              tempUnitId: Math.random().toString(36).substring(7),
              name: "",
              sku: "",
              isBase: !hasBase,
              multiplierToBase: "1",
            },
          ],
        };
      })
    );
  }

  function removeQuickAddUnit(tempId: string, tempUnitId: string): void {
    setQuickAddRows((prev) =>
      prev.map((row) => {
        if (row.tempId !== tempId) return row;
        if (row.units.length <= 1) return row;
        const nextUnits = row.units.filter((u) => u.tempUnitId !== tempUnitId);
        if (!nextUnits.some((u) => u.isBase)) {
          nextUnits[0] = { ...nextUnits[0], isBase: true, multiplierToBase: "1" };
        }
        return { ...row, units: nextUnits };
      })
    );
  }

  function updateQuickAddUnit(tempId: string, tempUnitId: string, update: Partial<QuickAddUnitForm>): void {
    setQuickAddRows((prev) =>
      prev.map((row) => {
        if (row.tempId !== tempId) return row;
        const nextUnits = row.units.map((unit) =>
          unit.tempUnitId === tempUnitId ? { ...unit, ...update } : unit
        );
        if (update.isBase) {
          return {
            ...row,
            units: nextUnits.map((unit) => ({
              ...unit,
              isBase: unit.tempUnitId === tempUnitId,
              multiplierToBase: unit.tempUnitId === tempUnitId ? "1" : unit.multiplierToBase,
            })),
          };
        }
        return { ...row, units: nextUnits };
      })
    );
  }

  async function handleSaveQuickAdd(): Promise<void> {
    setCatalogError(null);
    setCatalogSuccess(null);

    const validRows = quickAddRows.filter((row) => row.code.trim() && row.name.trim());
    if (validRows.length === 0) {
      setCatalogError("กรุณากรอกข้อมูลอย่างน้อย 1 รายการ");
      return;
    }

    setIsSavingQuickAdd(true);

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const row of validRows) {
      try {
        const payload: UpsertProductCatalogInput = {
          code: row.code.trim(),
          name: row.name.trim(),
          description: row.description.trim() || null,
          isActive: true,
          units: row.units.map((unit) => ({
            name: unit.name.trim(),
            sku: unit.sku.trim() || null,
            isBase: unit.isBase,
            multiplierToBase: Number(unit.isBase ? "1" : unit.multiplierToBase || "0"),
          })),
        };

        const response = await fetch("/api/admin/products/catalog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.message ?? "บันทึกไม่สำเร็จ");
        }

        successCount++;
      } catch (error) {
        failCount++;
        errors.push(`${row.name}: ${error instanceof Error ? error.message : "บันทึกไม่สำเร็จ"}`);
      }
    }

    setIsSavingQuickAdd(false);
    await loadCatalog();

    if (failCount === 0) {
      setCatalogSuccess(`เพิ่มสินค้าสำเร็จ ${successCount} รายการ`);
      setQuickAddRows([emptyQuickAddRow()]);
      setIsQuickAddMode(false);
    } else {
      setCatalogError(`เพิ่มสำเร็จ ${successCount} รายการ, ล้มเหลว ${failCount} รายการ:\n${errors.join("\n")}`);
    }
  }

  function handleAssignmentUnitChange(index: number, update: Partial<AssignmentUnitForm>): void {
    setAssignmentUnits((prev) =>
      prev.map((unit, unitIndex) => (unitIndex === index ? { ...unit, ...update } : unit)),
    );
  }

  async function submitAssignment(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!selectedEmployeeId) {
      setAssignmentError("กรุณาเลือกพนักงาน");
      return;
    }
    if (!selectedProductId) {
      setAssignmentError("กรุณาเลือกสินค้า");
      return;
    }
    setIsSavingAssignment(true);
    setAssignmentError(null);
    try {
      const payload: UpsertAssignmentInput = {
        productId: selectedProductId,
        employeeId: selectedEmployeeId,
        storeId: selectedStoreId || null,
        units: assignmentUnits.map((unit) => ({
          unitId: unit.unitId,
          pricePc: Number(unit.pricePc || "0"),
          enabled: unit.enabled,
        })),
      };

      const response = await fetch("/api/admin/products/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "ไม่สามารถบันทึกการผูกสินค้าได้");
      }

      await loadAssignments(selectedEmployeeId, selectedStoreId);
      setAssignmentSuccess("บันทึกราคาสำเร็จ");
    } catch (error) {
      const message = error instanceof Error ? error.message : "ไม่สามารถบันทึกการผูกสินค้าได้";
      setAssignmentError(message);
    } finally {
      setIsSavingAssignment(false);
    }
  }

  async function handleDeleteAssignment(assignmentId: string): Promise<void> {
    if (!window.confirm("ต้องการลบการผูกสินค้านี้หรือไม่?")) {
      return;
    }
    try {
      const response = await fetch("/api/admin/products/assignments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "ไม่สามารถลบการผูกสินค้าได้");
      }
      await loadAssignments(selectedEmployeeId, selectedStoreId);
      setAssignmentSuccess("ลบการผูกสินค้าสำเร็จ");
    } catch (error) {
      const message = error instanceof Error ? error.message : "ไม่สามารถลบการผูกสินค้าได้";
      setAssignmentError(message);
    }
  }

  async function handleExport(format: "csv" | "excel"): Promise<void> {
    try {
      const response = await fetch(`/api/admin/products/export?format=${format}`);
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "ไม่สามารถ export ข้อมูลได้");
      }

      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      let filename = filenameMatch?.[1]?.replace(/['"]/g, "") ?? `products-export.${format === "csv" ? "csv" : "xlsx"}`;
      filename = filename.trim();

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setCatalogSuccess(`Export ${format.toUpperCase()} สำเร็จ`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "ไม่สามารถ export ข้อมูลได้";
      setCatalogError(message);
    }
  }

  async function handleImport(file: File): Promise<void> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/admin/products/import", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error ?? data?.message ?? "ไม่สามารถ import ข้อมูลได้");
    }

    await loadCatalog();
    setCatalogSuccess("Import ข้อมูลสำเร็จ");
  }

  async function handleExportAssignments(format: "csv" | "excel"): Promise<void> {
    try {
      const params = new URLSearchParams();
      params.set("format", format);
      if (selectedEmployeeId) {
        params.set("employeeId", selectedEmployeeId);
      }
      if (selectedStoreId) {
        params.set("storeId", selectedStoreId);
      }

      const response = await fetch(`/api/admin/product-assignments/export?${params.toString()}`);
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "ไม่สามารถ export ข้อมูลการผูกสินค้าได้");
      }

      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      let filename = filenameMatch?.[1]?.replace(/['"]/g, "") ?? `product-assignments-export.${format === "csv" ? "csv" : "xlsx"}`;
      filename = filename.trim();

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setAssignmentSuccess(`Export ${format.toUpperCase()} การผูกสินค้าสำเร็จ`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "ไม่สามารถ export ข้อมูลการผูกสินค้าได้";
      setAssignmentError(message);
    }
  }

  async function handleImportAssignments(file: File): Promise<void> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/admin/product-assignments/import", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error ?? data?.message ?? "ไม่สามารถ import ข้อมูลการผูกสินค้าได้");
    }

    const result = await response.json();

    if (selectedEmployeeId) {
      await loadAssignments(selectedEmployeeId, selectedStoreId);
    }

    setAssignmentSuccess(
      result.message || `Import การผูกสินค้าสำเร็จ ${result.success || 0} รายการ`
    );
  }

  // Search and filter logic
  const filteredCatalog = useMemo(() => {
    let filtered = catalog;

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(
        (product) =>
          product.name.toLowerCase().includes(query) ||
          product.code.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((product) =>
        statusFilter === "active" ? product.isActive : !product.isActive
      );
    }

    return filtered;
  }, [catalog, searchQuery, statusFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredCatalog.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedCatalog = filteredCatalog.slice(startIndex, endIndex);

  // Bulk selection handlers
  const handleToggleAll = useCallback(() => {
    if (selectedProducts.size === paginatedCatalog.length && paginatedCatalog.length > 0) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(paginatedCatalog.map((p) => p.id)));
    }
  }, [paginatedCatalog, selectedProducts.size]);

  const handleToggleProduct = useCallback((productId: string) => {
    setSelectedProducts((prev) => {
      const updated = new Set(prev);
      if (updated.has(productId)) {
        updated.delete(productId);
      } else {
        updated.add(productId);
      }
      return updated;
    });
  }, []);

  // Filter stores based on selected employee's store assignments from database
  // Show only stores that the employee is assigned to
  const storeOptionsForEmployee = useMemo(() => {
    if (!selectedEmployeeId) {
      // No employee selected - show all stores
      return stores;
    }

    // Find the selected employee to get their store assignments
    const employee = employees.find(emp => emp.id === selectedEmployeeId);
    if (!employee || !employee.storeIds || employee.storeIds.length === 0) {
      // Employee not found or has no store assignments - show all stores
      return stores;
    }

    // Filter stores to only show ones where employee is assigned
    return stores.filter((store) => employee.storeIds!.includes(store.id));
  }, [stores, selectedEmployeeId, employees]);

  return (
    <div className="space-y-8 pb-12">
      <header className="rounded-3xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 px-8 py-10 text-white shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-white/80">แดชบอร์ดสินค้า</p>
            <h1 className="mt-2 text-3xl font-bold">จัดการสินค้า หน่วย และราคาพนักงาน</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/80">
              เพิ่มข้อมูลสินค้า กำหนดหน่วยฐาน (ซอง) และสร้างราคาเฉพาะสำหรับพนักงานแต่ละพื้นที่ได้จากหน้าจอเดียว
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 sm:w-auto sm:justify-start"
            >
              <Upload className="h-4 w-4" /> Import สินค้า
            </button>
            <button
              type="button"
              onClick={() => handleExport("csv")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 sm:w-auto sm:justify-start"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button
              type="button"
              onClick={() => handleExport("excel")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 sm:w-auto sm:justify-start"
            >
              <Download className="h-4 w-4" /> Export Excel
            </button>
          </div>
        </div>
      </header>

      {/* Success/Error Messages */}
      {catalogSuccess && (
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50/80 px-5 py-4 text-sm text-emerald-700 shadow-inner whitespace-pre-line">
          {catalogSuccess}
        </div>
      )}
      {catalogError && (
        <div className="rounded-3xl border border-red-100 bg-red-50/80 px-5 py-4 text-sm text-red-600 shadow-inner whitespace-pre-line">
          {catalogError}
        </div>
      )}

      {/* Quick Add Mode OR Regular Form */}
      {isQuickAddMode ? (
        <section className="rounded-3xl border border-purple-100 bg-gradient-to-br from-white to-purple-50/30 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">เพิ่มสินค้าหลายรายการพร้อมกัน</h2>
                <p className="text-sm text-slate-500">กรอกข้อมูลในตารางด้านล่าง แล้วกด &ldquo;บันทึกทั้งหมด&rdquo;</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setIsQuickAddMode(false);
                setQuickAddRows([emptyQuickAddRow()]);
              }}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              ปิด
            </button>
          </div>

          <div className="space-y-4">
            {quickAddRows.map((row) => (
              <div key={row.tempId} className="rounded-2xl border-2 border-purple-200 bg-white p-4 shadow-sm">
                {/* Product Basic Info */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-semibold text-purple-900">รหัสสินค้า *</label>
                    <input
                      type="text"
                      value={row.code}
                      onChange={(e) => updateQuickAddRow(row.tempId, "code", e.target.value)}
                      placeholder="SKU-001"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-purple-900">ชื่อสินค้า *</label>
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateQuickAddRow(row.tempId, "name", e.target.value)}
                      placeholder="ชื่อสินค้า"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-purple-900">รายละเอียด</label>
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) => updateQuickAddRow(row.tempId, "description", e.target.value)}
                      placeholder="รายละเอียด (ไม่บังคับ)"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                </div>

                {/* Units Section */}
                <div className="mt-4 rounded-xl border border-purple-200 bg-purple-50/30 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      type="button"
                      onClick={() => toggleShowUnits(row.tempId)}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-purple-700 hover:text-purple-900"
                    >
                      <Package className="h-4 w-4" />
                      จัดการหน่วย ({row.units.length} หน่วย)
                      <svg
                        className={`h-4 w-4 transition-transform ${row.showUnits ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => addQuickAddUnit(row.tempId)}
                      className="inline-flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-purple-700"
                    >
                      <Plus className="h-3 w-3" />
                      เพิ่มหน่วย
                    </button>
                  </div>

                  {row.showUnits && (
                    <div className="space-y-2">
                      {row.units.map((unit, unitIndex) => {
                        const multiplierValue = unit.isBase ? "1" : unit.multiplierToBase;
                        const multiplierNumber = Number.parseFloat(multiplierValue || "0");
                        const multiplierLabel = Number.isFinite(multiplierNumber) && multiplierNumber > 0 ? multiplierNumber : 0;
                        const canRemove = row.units.length > 1;

                        return (
                          <div key={unit.tempUnitId} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_120px_80px_40px]">
                              <div>
                                <label className="text-[10px] font-semibold text-slate-600">ชื่อหน่วย *</label>
                                <input
                                  type="text"
                                  value={unit.name}
                                  onChange={(e) => updateQuickAddUnit(row.tempId, unit.tempUnitId, { name: e.target.value })}
                                  placeholder="เช่น กล่อง / แพ็ค"
                                  className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:border-purple-500 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-slate-600">SKU</label>
                                <input
                                  type="text"
                                  value={unit.sku}
                                  onChange={(e) => updateQuickAddUnit(row.tempId, unit.tempUnitId, { sku: e.target.value })}
                                  placeholder="SKU-001"
                                  className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5 text-sm focus:border-purple-500 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] font-semibold text-slate-600">จำนวนซองต่อหน่วย</label>
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={multiplierValue}
                                  onChange={(e) => updateQuickAddUnit(row.tempId, unit.tempUnitId, { multiplierToBase: e.target.value })}
                                  disabled={unit.isBase}
                                  className={clsx(
                                    "mt-0.5 w-full rounded border px-2 py-1.5 text-sm focus:border-purple-500 focus:outline-none",
                                    unit.isBase ? "border-sky-200 bg-sky-50 text-sky-600" : "border-slate-200 bg-white"
                                  )}
                                />
                                <p className="mt-0.5 text-[10px] text-slate-500">
                                  1 {unit.name || "หน่วย"} = {multiplierLabel.toLocaleString("th-TH")} ซอง
                                </p>
                              </div>
                              <div className="flex items-end">
                                <button
                                  type="button"
                                  onClick={() => updateQuickAddUnit(row.tempId, unit.tempUnitId, { isBase: true })}
                                  className={clsx(
                                    "w-full rounded px-2 py-1.5 text-[10px] font-semibold transition",
                                    unit.isBase
                                      ? "bg-sky-100 text-sky-600"
                                      : "border border-slate-200 text-slate-500 hover:border-sky-200 hover:text-sky-600"
                                  )}
                                >
                                  {unit.isBase ? "หน่วยฐาน" : "ตั้งเป็นฐาน"}
                                </button>
                              </div>
                              <div className="flex items-end">
                                <button
                                  type="button"
                                  onClick={() => removeQuickAddUnit(row.tempId, unit.tempUnitId)}
                                  disabled={!canRemove}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Remove Product Button */}
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeQuickAddRow(row.tempId)}
                    disabled={quickAddRows.length === 1}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    ลบสินค้านี้
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={addQuickAddRow}
              className="inline-flex items-center gap-2 rounded-2xl border border-purple-200 bg-white px-4 py-2 text-sm font-medium text-purple-700 transition hover:bg-purple-50"
            >
              <Plus className="h-4 w-4" />
              เพิ่มแถว
            </button>
            <button
              type="button"
              onClick={handleSaveQuickAdd}
              disabled={isSavingQuickAdd}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-purple-500 px-6 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-purple-700 hover:to-purple-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSavingQuickAdd ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  บันทึกทั้งหมด ({quickAddRows.filter((r) => r.code.trim() && r.name.trim()).length} รายการ)
                </>
              )}
            </button>
          </div>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Product List with Search/Filter/Pagination */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">รายการสินค้า</h2>
                <p className="text-sm text-slate-500">
                  {filteredCatalog.length} รายการจากทั้งหมด {catalog.length} รายการ
                </p>
              </div>
              <button
                type="button"
                onClick={loadCatalog}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                <RefreshCw className="h-4 w-4" /> รีเฟรช
              </button>
            </div>

            {/* Search and Filter */}
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อหรือรหัสสินค้า..."
                  className="w-full rounded-2xl border border-slate-300 py-2 pl-10 pr-4 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div className="relative">
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                  className="w-full appearance-none rounded-2xl border border-slate-300 py-2 pl-10 pr-10 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                >
                  <option value="all">สถานะ: ทั้งหมด</option>
                  <option value="active">สถานะ: ใช้งาน</option>
                  <option value="inactive">สถานะ: ไม่ใช้งาน</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsQuickAddMode(true);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-purple-700"
              >
                <Plus className="h-4 w-4" />
                เพิ่มหลายรายการ
              </button>

              {selectedProducts.size > 0 && (
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  ลบที่เลือก ({selectedProducts.size})
                </button>
              )}

              {(searchQuery || statusFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                  ล้างตัวกรอง
                </button>
              )}
            </div>

            {/* Product Cards */}
            <div className="max-h-[500px] overflow-y-auto pr-1">
              {isLoadingCatalog ? (
                <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-slate-400">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                </div>
              ) : filteredCatalog.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                  <AlertCircle className="mx-auto h-12 w-12 text-slate-400" />
                  <p className="mt-3 text-sm font-medium text-slate-600">ไม่พบสินค้า</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {searchQuery || statusFilter !== "all" ? "ลองเปลี่ยนคำค้นหาหรือตัวกรอง" : "เริ่มต้นโดยเพิ่มสินค้าใหม่"}
                  </p>
                </div>
              ) : (
                <>
                  {/* Bulk select all */}
                  {paginatedCatalog.length > 0 && (
                    <div className="mb-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.size === paginatedCatalog.length && paginatedCatalog.length > 0}
                        onChange={handleToggleAll}
                        className="h-4 w-4 rounded border-slate-300 text-sky-600"
                      />
                      <span className="text-sm text-slate-700">
                        เลือกทั้งหมดในหน้านี้ ({paginatedCatalog.length} รายการ)
                      </span>
                    </div>
                  )}

                  <ul className="space-y-3">
                    {paginatedCatalog.map((product) => (
                      <li
                        key={product.id}
                        className={clsx(
                          "group rounded-2xl border-2 p-4 transition",
                          selectedProducts.has(product.id)
                            ? "border-sky-400 bg-sky-50/50 shadow-lg"
                            : "border-slate-200 hover:border-slate-300 hover:shadow-sm"
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.id)}
                            onChange={() => handleToggleProduct(product.id)}
                            className="mt-1 h-5 w-5 rounded border-slate-300 text-sky-600"
                          />

                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                                    <Package className="h-4 w-4" />
                                  </span>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                                    <p className="text-xs text-slate-500">รหัสสินค้า: {product.code}</p>
                                  </div>
                                </div>
                                {product.description && (
                                  <p className="text-xs text-slate-500">{product.description}</p>
                                )}
                                {product.isActive ? (
                                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                    ใช้งาน
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                                    ปิดใช้งาน
                                  </span>
                                )}
                                <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                                  {product.units.map((unit) => (
                                    <span
                                      key={unit.id}
                                      className={clsx(
                                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
                                        unit.isBase
                                          ? "border-sky-200 bg-sky-50 text-sky-600"
                                          : "border-slate-200 bg-slate-50",
                                      )}
                                    >
                                      <span>{unit.name}</span>
                                      <span className="text-slate-400">
                                        · {unit.isBase ? "หน่วยฐาน" : unit.multiplierToBase + " ซอง"}
                                      </span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEditCatalog(product)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-sky-200 hover:text-sky-600"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCatalog(product.id)}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-red-200 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-sm text-slate-600">
                        แสดง {startIndex + 1}-{Math.min(endIndex, filteredCatalog.length)} จาก {filteredCatalog.length} รายการ
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum: number;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }

                            return (
                              <button
                                key={pageNum}
                                type="button"
                                onClick={() => setCurrentPage(pageNum)}
                                className={clsx(
                                  "inline-flex h-9 w-9 items-center justify-center rounded-xl text-sm font-medium transition",
                                  currentPage === pageNum
                                    ? "bg-sky-600 text-white"
                                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                )}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>

          {/* Add/Edit Form */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <form onSubmit={submitCatalogForm} className="space-y-6">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  {catalogForm.id ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}
                </h2>
                {catalogForm.id && (
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-600">อยู่ในโหมดแก้ไข</span>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">รหัสสินค้า</label>
                  <input
                    required
                    value={catalogForm.code}
                    onChange={(event) => setCatalogForm((prev) => ({ ...prev, code: event.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    placeholder="เช่น SKU-001"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">ชื่อสินค้า</label>
                  <input
                    required
                    value={catalogForm.name}
                    onChange={(event) => setCatalogForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    placeholder="เช่น ผงกาแฟสำเร็จรูป"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-slate-700">รายละเอียด</label>
                  <textarea
                    value={catalogForm.description}
                    onChange={(event) => setCatalogForm((prev) => ({ ...prev, description: event.target.value }))}
                    rows={3}
                    className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    placeholder="บันทึกรายละเอียดเพิ่มเติม (ถ้ามี)"
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={catalogForm.isActive}
                    onChange={(event) => setCatalogForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  เปิดใช้งานสินค้า
                </label>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">กำหนดหน่วยขาย</p>
                    <p className="text-xs text-slate-500">
                      กำหนดหน่วยต่าง ๆ ที่ใช้ขาย พร้อมจำนวนซองต่อหน่วยเพื่อให้ระบบคำนวณยอดได้แม่นยำ
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCatalogUnit}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-sky-200 hover:text-sky-600"
                  >
                    <Plus className="h-4 w-4" /> เพิ่มหน่วย
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {catalogForm.units.map((unit, index) => {
                    const multiplierValue = unit.isBase ? "1" : unit.multiplierToBase;
                    const multiplierNumber = Number.parseFloat(multiplierValue || "0");
                    const multiplierLabel = Number.isFinite(multiplierNumber) && multiplierNumber > 0 ? multiplierNumber : 0;
                    const canRemove = catalogForm.units.length > 1;
                    return (
                      <div
                        key={unit.id ?? "unit-" + index}
                        className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-sm"
                      >
                        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,180px)_minmax(0,180px)]">
                          <div>
                            <label className="text-xs font-semibold text-slate-600">ชื่อหน่วย</label>
                            <input
                              required
                              value={unit.name}
                              onChange={(event) =>
                                handleUpdateCatalogUnit(index, { name: event.target.value })
                              }
                              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                              placeholder="เช่น ลัง / แพ็ค / ซอง"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-600">SKU (ถ้ามี)</label>
                            <input
                              value={unit.sku}
                              onChange={(event) =>
                                handleUpdateCatalogUnit(index, { sku: event.target.value })
                              }
                              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                              placeholder="เช่น SKU-001"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-600">จำนวนซองต่อหน่วย</label>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={multiplierValue}
                              onChange={(event) =>
                                handleUpdateCatalogUnit(index, { multiplierToBase: event.target.value })
                              }
                              disabled={unit.isBase}
                              className={clsx(
                                "mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100",
                                unit.isBase ? "border-sky-200 bg-sky-50 text-sky-600" : "border-slate-200 bg-white",
                              )}
                            />
                            <p className="mt-1 text-[11px] text-slate-500">
                              1 {unit.name || "หน่วย"} = {multiplierLabel.toLocaleString("th-TH")} ซอง
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => handleUpdateCatalogUnit(index, { isBase: true })}
                            className={clsx(
                              "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition",
                              unit.isBase
                                ? "bg-sky-100 text-sky-600"
                                : "border border-slate-200 text-slate-500 hover:border-sky-200 hover:text-sky-600",
                            )}
                          >
                            {unit.isBase ? "หน่วยฐาน (ซอง)" : "ตั้งเป็นหน่วยฐาน"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveCatalogUnit(index)}
                            disabled={!canRemove}
                            className={clsx(
                              "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold transition",
                              canRemove
                                ? "border border-red-200 text-red-600 hover:bg-red-50"
                                : "border border-slate-200 text-slate-300",
                            )}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> ลบหน่วย
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  หน่วยฐานคือซอง ระบบจะใช้จำนวนซองต่อหน่วยเพื่อแปลงยอดขายและสต็อกอัตโนมัติ
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={resetCatalogForm}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  <RefreshCw className="h-4 w-4" /> ล้างแบบฟอร์ม
                </button>
                <button
                  type="submit"
                  disabled={isSavingCatalog}
                  className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:from-sky-600 hover:to-indigo-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSavingCatalog ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      กำลังบันทึก...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      บันทึกสินค้า
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Product Assignment Section */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">ผูกสินค้าให้พนักงาน</h2>
            <p className="text-sm text-slate-500">
              เลือกพนักงานและร้าน แล้วกำหนดราคาขายสำหรับแต่ละหน่วย
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsImportAssignmentsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100"
            >
              <Upload className="h-4 w-4" /> Import การผูกสินค้า
            </button>
            <button
              type="button"
              onClick={() => handleExportAssignments("csv")}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button
              type="button"
              onClick={() => handleExportAssignments("excel")}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
            >
              <Download className="h-4 w-4" /> Export Excel
            </button>
            <button
              type="button"
              onClick={() => {
                if (selectedEmployeeId) {
                  void loadAssignments(selectedEmployeeId, selectedStoreId);
                }
              }}
              disabled={!selectedEmployeeId}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className="h-4 w-4" /> โหลดรายการล่าสุด
            </button>
          </div>
        </div>

        {assignmentError && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{assignmentError}</p>
        )}
        {assignmentSuccess && (
          <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{assignmentSuccess}</p>
        )}

        <form onSubmit={submitAssignment} className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium text-slate-700">พนักงาน</label>
              <select
                value={selectedEmployeeId}
                onChange={(event) => {
                  setSelectedEmployeeId(event.target.value);
                  setSelectedProductId("");
                }}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                <option value="">เลือกพนักงาน</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">ร้าน/พื้นที่</label>
              <select
                value={selectedStoreId}
                onChange={(event) => setSelectedStoreId(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              >
                <option value="">ทุกพื้นที่ที่รับผิดชอบ</option>
                {storeOptionsForEmployee.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">สินค้า</label>
              <select
                value={selectedProductId}
                onChange={(event) => setSelectedProductId(event.target.value)}
                disabled={catalog.length === 0}
                className="mt-1 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50"
              >
                <option value="">เลือกสินค้า</option>
                {catalog.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.code + " · " + product.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">ตั้งค่าหน่วยและราคา</p>
                <p className="text-xs text-slate-500">
                  เปิดหน่วยที่จะขาย พร้อมกรอกราคา PC (ราคาขาย)
                </p>
              </div>
            </div>
            {assignmentUnits.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                กรุณาเลือกสินค้าเพื่อกำหนดราคา
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {assignmentUnits.map((unit, index) => (
                  <div
                    key={unit.unitId}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{unit.unitName}</p>
                        <p className="text-xs text-slate-500">
                          1 {unit.unitName} = {unit.multiplierToBase.toLocaleString("th-TH")} ซอง
                        </p>
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={unit.enabled}
                          onChange={(event) =>
                            handleAssignmentUnitChange(index, { enabled: event.target.checked })
                          }
                          className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        เปิดขายหน่วยนี้
                      </label>
                    </div>
                    <div className="mt-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-600">ราคา PC (บาท)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={unit.pricePc}
                          onChange={(event) =>
                            handleAssignmentUnitChange(index, { pricePc: event.target.value })
                          }
                          disabled={!unit.enabled}
                          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:bg-slate-50"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-4 text-xs text-slate-500">
              ระบบจะใช้ราคา PC สำหรับบันทึกยอดขายและรายงานทั้งหมด
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingAssignment}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:from-emerald-600 hover:to-sky-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSavingAssignment ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  บันทึกราคา
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
              <ShoppingBag className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">รายการสินค้าที่ผูกไว้</p>
              <p className="text-xs text-slate-500">
                ตรวจสอบราคาที่กำหนดให้พนักงานและพื้นที่ที่เลือกอยู่ในปัจจุบัน
              </p>
            </div>
          </div>
          {assignmentsLoading ? (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-slate-400">
              <RefreshCw className="h-5 w-5 animate-spin" />
            </div>
          ) : assignments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center text-sm text-slate-500">
              ยังไม่มีสินค้าที่ผูกกับพนักงานหรือร้านที่เลือก
            </div>
          ) : (
            <ul className="space-y-3">
              {assignments.map((assignment) => {
                const store = assignment.storeId
                  ? stores.find((item) => item.id === assignment.storeId)
                  : null;
                const storeLabel = store?.name ?? (assignment.storeId ? "ร้านถูกลบ" : "ทุกพื้นที่");
                return (
                  <li
                    key={assignment.assignmentId}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-300 hover:shadow"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">{assignment.productName}</p>
                        <p className="text-xs text-slate-500">
                          {assignment.productCode + " · " + storeLabel}
                        </p>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {assignment.units.map((unit) => (
                            <span
                              key={unit.assignmentUnitId}
                              className={clsx(
                                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5",
                                unit.isActive
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-slate-200 bg-slate-50 text-slate-400",
                              )}
                            >
                              <span>{unit.unitName}</span>
                              <span className="text-[11px] text-slate-400">
                                {formatCurrency(unit.pricePc)}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEmployeeId(selectedEmployeeId);
                            setSelectedStoreId(assignment.storeId || "");
                            setSelectedProductId(assignment.productId);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 px-3 py-1.5 text-sm font-medium text-sky-600 transition hover:bg-sky-50"
                        >
                          <Edit className="h-4 w-4" /> แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAssignment(assignment.assignmentId)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" /> ลบ
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Import Modals */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
        title="นำเข้าข้อมูลสินค้า"
        acceptedFormats="CSV, Excel"
        templateDownloadUrl="/api/admin/products/export?format=csv"
      />

      <ImportModal
        isOpen={isImportAssignmentsModalOpen}
        onClose={() => setIsImportAssignmentsModalOpen(false)}
        onImport={handleImportAssignments}
        title="นำเข้าข้อมูลการผูกสินค้า"
        acceptedFormats="CSV, Excel"
        templateDownloadUrl="/api/admin/product-assignments/export?format=csv"
      />
    </div>
  );
}
