"use client";

import { useEffect, useMemo, useState } from "react";
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

  useEffect(() => {
    void Promise.all([loadCatalog(), loadEmployees(), loadStores()]);
  }, []);

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
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [catalogSuccess, assignmentSuccess]);

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
  }

  async function handleDeleteCatalog(productId: string): Promise<void> {
    if (!window.confirm("ต้องการลบรายการสินค้านี้หรือไม่?")) {
      return;
    }
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
      if (catalogForm.id === productId) {
        setCatalogForm(emptyCatalogForm());
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "ไม่สามารถลบสินค้าได้";
      setCatalogError(message);
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

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      let filename = filenameMatch?.[1]?.replace(/['"]/g, "") ?? `products-export.${format === "csv" ? "csv" : "xlsx"}`;
      // Remove any trailing underscores or special characters
      filename = filename.trim();

      // Download file
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

    // Reload catalog after successful import
    await loadCatalog();
    setCatalogSuccess("Import ข้อมูลสำเร็จ");
  }

  async function handleExportAssignments(format: "csv" | "excel"): Promise<void> {
    try {
      // Build query parameters
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

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      let filename = filenameMatch?.[1]?.replace(/['"]/g, "") ?? `product-assignments-export.${format === "csv" ? "csv" : "xlsx"}`;
      // Remove any trailing underscores or special characters
      filename = filename.trim();

      // Download file
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

    // Reload assignments after successful import
    if (selectedEmployeeId) {
      await loadAssignments(selectedEmployeeId, selectedStoreId);
    }

    setAssignmentSuccess(
      result.message || `Import การผูกสินค้าสำเร็จ ${result.success || 0} รายการ`
    );
  }

  const storeOptionsForEmployee = useMemo(() => stores, [stores]);


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
            <button
              type="button"
              onClick={resetCatalogForm}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 sm:w-auto sm:justify-start"
            >
              <RefreshCw className="h-4 w-4" /> เคลียร์แบบฟอร์ม
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">รายการสินค้า</h2>
              <p className="text-sm text-slate-500">ภาพรวมสินค้าและหน่วยที่ใช้กำหนดราคา</p>
            </div>
            <button
              type="button"
              onClick={loadCatalog}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 sm:w-auto sm:justify-start"
            >
              <RefreshCw className="h-4 w-4" /> โหลดข้อมูลอีกครั้ง
            </button>
          </div>

          {catalogError && (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{catalogError}</p>
          )}
          {catalogSuccess && (
            <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{catalogSuccess}</p>
          )}

          <div className="mt-6 max-h-[420px] overflow-y-auto pr-1">
            {isLoadingCatalog ? (
              <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-slate-400">
                <RefreshCw className="h-5 w-5 animate-spin" />
              </div>
            ) : catalog.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
                ยังไม่มีข้อมูลสินค้าในระบบ
              </div>
            ) : (
              <ul className="space-y-3">
                {catalog.map((product) => (
                  <li
                    key={product.id}
                    className="group rounded-2xl border border-slate-200 p-4 transition hover:border-sky-400 hover:shadow-sm"
                  >
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
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
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
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-sky-200 hover:text-sky-600 sm:w-auto sm:justify-start"
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
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 sm:w-auto sm:justify-start"
              >
                <RefreshCw className="h-4 w-4" /> ล้างแบบฟอร์ม
              </button>
              <button
                type="submit"
                disabled={isSavingCatalog}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:from-sky-600 hover:to-indigo-600 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-100 sm:w-auto sm:justify-start"
            >
              <Upload className="h-4 w-4" /> Import การผูกสินค้า
            </button>
            <button
              type="button"
              onClick={() => handleExportAssignments("csv")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 sm:w-auto sm:justify-start"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button
              type="button"
              onClick={() => handleExportAssignments("excel")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 sm:w-auto sm:justify-start"
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:justify-start"
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:from-emerald-600 hover:to-sky-600 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
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

        <div className="mt-8 space-y-4 overflow-x-auto">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                            // Load assignment into form for editing
                            setSelectedEmployeeId(selectedEmployeeId); // Keep current employee
                            setSelectedStoreId(assignment.storeId || "");
                            setSelectedProductId(assignment.productId);
                            // Scroll to form
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-200 px-3 py-1.5 text-sm font-medium text-sky-600 transition hover:bg-sky-50 sm:w-auto sm:justify-start"
                        >
                          <Edit className="h-4 w-4" /> แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAssignment(assignment.assignmentId)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 sm:w-auto sm:justify-start"
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

      {/* Import Modal - Product Catalog */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
        title="นำเข้าข้อมูลสินค้า"
        acceptedFormats="CSV, Excel"
        templateDownloadUrl="/api/admin/products/export?format=csv"
      />

      {/* Import Modal - Product Assignments */}
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
