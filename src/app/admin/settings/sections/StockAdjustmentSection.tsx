"use client";

import { useState, useMemo, useCallback, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Settings,
  User,
  Building2,
  PackageCheck,
  Layers,
  Package,
  Info,
  Save,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// Types
type Employee = {
  id: string;
  name: string;
  employee_code?: string | null;
};

type Store = {
  id: string;
  name: string;
  province?: string | null;
};

type ProductUnit = {
  unitId: string;
  unitName: string;
  assignmentUnitId: string;
  multiplierToBase: number;
};

type Product = {
  productId: string;
  productCode: string;
  productName: string;
  assignmentId: string;
  units: ProductUnit[];
};

type InventoryItem = {
  productId: string;
  productCode: string;
  productName: string;
  unitId: string;
  unitName: string;
  balance: number;
  updatedAt: string;
};

type TransactionType = "adjustment";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export default function StockAdjustmentSection() {
  const queryClient = useQueryClient();

  // Selection state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");

  // Form state
  const [adjustProductId, setAdjustProductId] = useState<string>("");
  const [adjustUnitId, setAdjustUnitId] = useState<string>("");
  const [adjustType, setAdjustType] = useState<"add" | "subtract" | "set">("add");
  const [adjustQuantity, setAdjustQuantity] = useState<string>("");
  const [adjustReason, setAdjustReason] = useState<string>("count");
  const [adjustNote, setAdjustNote] = useState<string>("");

  // Submit state
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  // Fetch employees
  const { data: employeesData, isLoading: isLoadingEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const response = await fetch("/api/admin/employees");
      if (!response.ok) throw new Error("ไม่สามารถโหลดรายชื่อพนักงานได้");
      const data = await response.json();
      return data.employees as Employee[];
    },
  });

  // Fetch stores
  const { data: storesData, isLoading: isLoadingStores } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const response = await fetch("/api/admin/stores");
      if (!response.ok) throw new Error("ไม่สามารถโหลดรายชื่อร้านได้");
      const data = await response.json();
      return data.stores as Store[];
    },
  });

  // Fetch products for selected employee and store
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ["stock-products", selectedEmployeeId, selectedStoreId],
    queryFn: async () => {
      if (!selectedEmployeeId) return [];
      const params = new URLSearchParams({
        employeeId: selectedEmployeeId,
        onlyActive: "true",
      });
      if (selectedStoreId) {
        params.set("storeId", selectedStoreId);
      }
      const response = await fetch(`/api/stock/products?${params.toString()}`);
      if (!response.ok) throw new Error("ไม่สามารถโหลดข้อมูลสินค้าได้");
      const data = await response.json();
      return data.products as Product[];
    },
    enabled: !!selectedEmployeeId,
  });

  // Fetch inventory balance
  const { data: inventoryData } = useQuery({
    queryKey: ["stock-inventory", selectedEmployeeId, selectedStoreId],
    queryFn: async () => {
      if (!selectedEmployeeId || !selectedStoreId) return [];
      const params = new URLSearchParams({
        employeeId: selectedEmployeeId,
        storeId: selectedStoreId,
      });
      const response = await fetch(`/api/stock/inventory?${params.toString()}`);
      if (!response.ok) throw new Error("ไม่สามารถโหลดข้อมูลคงเหลือได้");
      const data = await response.json();
      return data.inventory as InventoryItem[];
    },
    enabled: !!selectedEmployeeId && !!selectedStoreId,
  });

  // Mutation for submitting transaction
  const transactionMutation = useMutation({
    mutationFn: async (payload: {
      transactionType: TransactionType;
      employeeId: string;
      storeId: string;
      productId: string;
      unitId: string;
      quantity: number;
      note?: string;
      adjustmentType?: "add" | "subtract" | "set";
      reason?: string;
    }) => {
      const apiPayload = {
        transaction_type: payload.transactionType,
        employee_id: payload.employeeId,
        store_id: payload.storeId,
        product_id: payload.productId,
        unit_id: payload.unitId,
        quantity: payload.quantity,
        note: payload.note,
      };

      const response = await fetch("/api/stock/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiPayload),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error ?? "ไม่สามารถบันทึกรายการได้");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["stock-transactions"] });
    },
  });

  // Variables derived from React Query (wrapped in useMemo to stabilize references)
  const employees = useMemo(() => employeesData ?? [], [employeesData]);
  const stores = useMemo(() => storesData ?? [], [storesData]);
  const products = useMemo(() => productsData ?? [], [productsData]);
  const inventory = useMemo(() => inventoryData ?? [], [inventoryData]);

  const selectedAdjustProduct = useMemo(
    () => products.find((prod) => prod.productId === adjustProductId),
    [products, adjustProductId]
  );

  const adjustBalance = useMemo(() => {
    if (!adjustProductId || !adjustUnitId) return null;
    return inventory.find(
      (item) => item.productId === adjustProductId && item.unitId === adjustUnitId
    );
  }, [inventory, adjustProductId, adjustUnitId]);

  const resetAdjustForm = useCallback(() => {
    setAdjustProductId("");
    setAdjustUnitId("");
    setAdjustType("add");
    setAdjustQuantity("");
    setAdjustReason("count");
    setAdjustNote("");
  }, []);

  const handleAdjustSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!selectedEmployeeId) {
        setSubmitState({ status: "error", message: "กรุณาเลือกพนักงาน" });
        return;
      }

      if (!selectedStoreId) {
        setSubmitState({ status: "error", message: "กรุณาเลือกร้านค้า" });
        return;
      }

      if (!adjustProductId) {
        setSubmitState({ status: "error", message: "กรุณาเลือกสินค้า" });
        return;
      }

      if (!adjustUnitId) {
        setSubmitState({ status: "error", message: "กรุณาเลือกหน่วย" });
        return;
      }

      const quantity = parseFloat(adjustQuantity);
      if (!Number.isFinite(quantity) || quantity < 0) {
        setSubmitState({ status: "error", message: "กรุณาระบุจำนวนที่ถูกต้อง" });
        return;
      }

      setSubmitState({ status: "submitting" });

      try {
        const reasonLabels: Record<string, string> = {
          count: "ตรวจนับสต็อก",
          damage: "สินค้าเสียหาย",
          loss: "สินค้าสูญหาย",
          other: "อื่นๆ",
        };
        const reasonLabel = reasonLabels[adjustReason] ?? adjustReason;
        const typeLabel =
          adjustType === "add" ? "เพิ่ม" : adjustType === "subtract" ? "ลด" : "กำหนดใหม่";
        const noteText = `ปรับสต็อก (${typeLabel}) - ${reasonLabel}${adjustNote ? `: ${adjustNote}` : ""}`;

        // Calculate final quantity based on adjustment type
        let finalQuantity = quantity;

        if (adjustType === "subtract") {
          finalQuantity = -Math.abs(quantity);
        } else if (adjustType === "add") {
          finalQuantity = Math.abs(quantity);
        } else if (adjustType === "set") {
          const currentBalance = inventory.find(
            (item) => item.productId === adjustProductId && item.unitId === adjustUnitId
          );
          const currentQty = currentBalance?.balance ?? 0;
          finalQuantity = quantity - currentQty;
        }

        const finalQuantityInt = Math.round(finalQuantity);

        await transactionMutation.mutateAsync({
          transactionType: "adjustment",
          employeeId: selectedEmployeeId,
          storeId: selectedStoreId,
          productId: adjustProductId,
          unitId: adjustUnitId,
          quantity: finalQuantityInt,
          note: noteText,
          adjustmentType: adjustType,
          reason: adjustReason,
        });

        setSubmitState({ status: "success", message: "บันทึกการปรับสต็อกเรียบร้อย" });
        resetAdjustForm();

        setTimeout(() => {
          setSubmitState({ status: "idle" });
        }, 3000);
      } catch (error) {
        const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาด";
        setSubmitState({ status: "error", message });
      }
    },
    [
      selectedEmployeeId,
      selectedStoreId,
      adjustProductId,
      adjustUnitId,
      adjustType,
      adjustQuantity,
      adjustReason,
      adjustNote,
      inventory,
      transactionMutation,
      resetAdjustForm,
    ]
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <Settings className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-900">ปรับสต็อกสินค้า</h3>
            <p className="mt-1 text-xs text-amber-700">
              ใช้สำหรับเพิ่ม ลด หรือกำหนดยอดสต็อกใหม่ เช่น ตรวจนับสต็อก สินค้าเสียหาย หรือสินค้าสูญหาย
            </p>
          </div>
        </div>
      </div>

      {/* Submit State Messages */}
      {submitState.status === "error" && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <span className="font-medium">{submitState.message}</span>
        </div>
      )}
      {submitState.status === "success" && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <span className="font-medium">{submitState.message}</span>
        </div>
      )}

      <form onSubmit={handleAdjustSubmit} className="space-y-6">
        {/* Employee and Store Selection */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label
              className="flex items-center gap-2 text-sm font-semibold text-slate-700"
              htmlFor="adjust-employee"
            >
              <User className="h-4 w-4 text-blue-600" />
              พนักงาน
            </label>
            {isLoadingEmployees ? (
              <div className="form-input flex h-[52px] items-center justify-center text-xs text-slate-400">
                <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-b-transparent mr-2" />
                กำลังโหลด...
              </div>
            ) : (
              <select
                id="adjust-employee"
                value={selectedEmployeeId}
                onChange={(e) => {
                  setSelectedEmployeeId(e.target.value);
                  setAdjustProductId("");
                  setAdjustUnitId("");
                  setSubmitState({ status: "idle" });
                }}
                className="form-input"
                required
              >
                <option value="">เลือกพนักงาน</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                    {emp.employee_code ? ` (${emp.employee_code})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <label
              className="flex items-center gap-2 text-sm font-semibold text-slate-700"
              htmlFor="adjust-store"
            >
              <Building2 className="h-4 w-4 text-blue-600" />
              ร้านค้า / หน่วยงาน
            </label>
            {isLoadingStores ? (
              <div className="form-input flex h-[52px] items-center justify-center text-xs text-slate-400">
                <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-b-transparent mr-2" />
                กำลังโหลด...
              </div>
            ) : (
              <select
                id="adjust-store"
                value={selectedStoreId}
                onChange={(e) => {
                  setSelectedStoreId(e.target.value);
                  setAdjustProductId("");
                  setAdjustUnitId("");
                  setSubmitState({ status: "idle" });
                }}
                className="form-input"
                required
              >
                <option value="">เลือกร้านค้า</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                    {store.province ? ` (${store.province})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Product and Unit Selection */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label
              className="flex items-center gap-2 text-sm font-semibold text-slate-700"
              htmlFor="adjust-product"
            >
              <PackageCheck className="h-4 w-4 text-blue-600" />
              สินค้า
            </label>
            {isLoadingProducts ? (
              <div className="form-input flex h-[52px] items-center justify-center text-xs text-slate-400">
                <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-b-transparent mr-2" />
                กำลังโหลด...
              </div>
            ) : (
              <select
                id="adjust-product"
                value={adjustProductId}
                onChange={(e) => {
                  setAdjustProductId(e.target.value);
                  setAdjustUnitId("");
                }}
                className="form-input"
                disabled={!selectedEmployeeId}
                required
              >
                <option value="">เลือกสินค้า</option>
                {products.map((prod) => (
                  <option key={prod.productId} value={prod.productId}>
                    {prod.productCode} - {prod.productName}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-2">
            <label
              className="flex items-center gap-2 text-sm font-semibold text-slate-700"
              htmlFor="adjust-unit"
            >
              <Layers className="h-4 w-4 text-blue-600" />
              หน่วย
            </label>
            <select
              id="adjust-unit"
              value={adjustUnitId}
              onChange={(e) => setAdjustUnitId(e.target.value)}
              className="form-input"
              disabled={!adjustProductId}
              required
            >
              <option value="">เลือกหน่วย</option>
              {selectedAdjustProduct?.units.map((unit) => (
                <option key={unit.unitId} value={unit.unitId}>
                  {unit.unitName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Current Balance Display */}
        {adjustBalance && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-blue-600">สต็อกปัจจุบัน</p>
                <p className="text-2xl font-bold text-blue-900">
                  {adjustBalance.balance.toLocaleString("th-TH")} {adjustBalance.unitName}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Adjustment Type */}
        <div className="space-y-2">
          <label
            className="flex items-center gap-2 text-sm font-semibold text-slate-700"
            htmlFor="adjust-type"
          >
            <Settings className="h-4 w-4 text-blue-600" />
            ประเภทการปรับ
          </label>
          <select
            id="adjust-type"
            value={adjustType}
            onChange={(e) => setAdjustType(e.target.value as "add" | "subtract" | "set")}
            className="form-input"
            required
          >
            <option value="add">เพิ่ม (+)</option>
            <option value="subtract">ลด (-)</option>
            <option value="set">กำหนดยอดใหม่</option>
          </select>
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <label
            className="flex items-center gap-2 text-sm font-semibold text-slate-700"
            htmlFor="adjust-quantity"
          >
            <Package className="h-4 w-4 text-blue-600" />
            จำนวน
          </label>
          <input
            id="adjust-quantity"
            type="number"
            min="0"
            step="0.01"
            value={adjustQuantity}
            onChange={(e) => setAdjustQuantity(e.target.value)}
            className="form-input"
            placeholder="0"
            required
          />
        </div>

        {/* Reason */}
        <div className="space-y-2">
          <label
            className="flex items-center gap-2 text-sm font-semibold text-slate-700"
            htmlFor="adjust-reason"
          >
            <Info className="h-4 w-4 text-blue-600" />
            เหตุผล
          </label>
          <select
            id="adjust-reason"
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            className="form-input"
            required
          >
            <option value="count">ตรวจนับสต็อก</option>
            <option value="damage">สินค้าเสียหาย</option>
            <option value="loss">สินค้าสูญหาย</option>
            <option value="other">อื่นๆ</option>
          </select>
        </div>

        {/* Note */}
        <div className="space-y-2">
          <label
            className="flex items-center gap-2 text-sm font-semibold text-slate-700"
            htmlFor="adjust-note"
          >
            <Info className="h-4 w-4 text-blue-600" />
            รายละเอียดเพิ่มเติม (ไม่บังคับ)
          </label>
          <textarea
            id="adjust-note"
            value={adjustNote}
            onChange={(e) => setAdjustNote(e.target.value)}
            className="form-input min-h-[100px] resize-y"
            placeholder="ระบุรายละเอียดเพิ่มเติม..."
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitState.status === "submitting" || !selectedEmployeeId}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500 px-6 py-4 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitState.status === "submitting" ? (
            <>
              <RefreshCw className="h-5 w-5 animate-spin" />
              กำลังบันทึก...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              บันทึกการปรับสต็อก
            </>
          )}
        </button>
      </form>
    </div>
  );
}
