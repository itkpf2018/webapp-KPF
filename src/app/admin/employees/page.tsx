"use client";

import React, { useEffect, useId, useMemo, useState } from "react";
import type { EmployeeRecord, StoreRecord } from "@/lib/configStore";
import {
  REGION_BY_PROVINCE,
  THAI_PROVINCES,
  THAI_REGIONS,
} from "@/lib/thaiGeography";

type DraftEmployee = Pick<
  EmployeeRecord,
  | "id"
  | "name"
  | "employeeCode"
  | "phone"
  | "regularDayOff"
  | "province"
  | "region"
  | "defaultStoreId"
  | "createdAt"
  | "updatedAt"
>;

type EmployeeFormState = {
  name: string;
  employeeCode: string;
  phone: string;
  regularDayOff: string;
  province: string;
  region: string;
  defaultStoreId: string;
  selectedStoreIds: string[];
  primaryStoreId: string;
  targetRevenuePC: string; // เป้าหมายยอดขาย (บาท)
  targetQuantity: string; // เป้าหมายจำนวนขาย (ชิ้น) - optional
};

const EMPTY_FORM: EmployeeFormState = {
  name: "",
  employeeCode: "",
  phone: "",
  regularDayOff: "",
  province: "",
  region: "",
  defaultStoreId: "",
  selectedStoreIds: [],
  primaryStoreId: "",
  targetRevenuePC: "",
  targetQuantity: "",
};

const DAY_OFF_OPTIONS = [
  "",
  "จันทร์",
  "อังคาร",
  "พุธ",
  "พฤหัสบดี",
  "ศุกร์",
  "เสาร์",
  "อาทิตย์",
  "สลับ/ไม่แน่นอน",
];

type StoreOption = Pick<StoreRecord, "id" | "name" | "province">;

interface EmployeeStoreAssignment {
  id: string;
  employeeId: string;
  storeId: string;
  storeName: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

function buildPayload(input: EmployeeFormState) {
  return {
    name: input.name.trim(),
    employeeCode: input.employeeCode.trim() || undefined,
    phone: input.phone.trim() || undefined,
    regularDayOff: input.regularDayOff.trim() || undefined,
    province: input.province.trim() || undefined,
    region: input.region.trim() || undefined,
    defaultStoreId: input.defaultStoreId || undefined,
  };
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<DraftEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [storeError, setStoreError] = useState<string | null>(null);

  const [newEmployee, setNewEmployee] =
    useState<EmployeeFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<EmployeeFormState | null>(null);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(false);

  const rawProvinceListId = useId();
  const provinceDatalistId = `${rawProvinceListId}-province-options`.replace(/:/g, "-");
  const storeMap = useMemo(
    () => new Map(stores.map((store) => [store.id, store] as const)),
    [stores],
  );

  useEffect(() => {
    void refreshEmployees();
  }, []);

  useEffect(() => {
    let isActive = true;
    const loadStores = async () => {
      setIsLoadingStores(true);
      setStoreError(null);
      try {
        const response = await fetch("/api/admin/stores");
        if (!response.ok) {
          throw new Error("ไม่สามารถโหลดรายชื่อร้าน/หน่วยงานได้");
        }
        const data = (await response.json()) as { stores?: StoreOption[] };
        if (!isActive) return;
        const list = Array.isArray(data.stores) ? data.stores : [];
        setStores(list);
      } catch (err) {
        if (!isActive) return;
        const message =
          err instanceof Error ? err.message : "ไม่สามารถโหลดรายชื่อร้าน/หน่วยงานได้";
        setStores([]);
        setStoreError(message);
      } finally {
        if (isActive) {
          setIsLoadingStores(false);
        }
      }
    };
    void loadStores();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const refreshEmployees = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/employees");
      if (!response.ok) {
        throw new Error("ไม่สามารถโหลดรายชื่อพนักงานได้");
      }
      const data = (await response.json()) as { employees?: DraftEmployee[] };
      setEmployees(Array.isArray(data.employees) ? data.employees : []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "ไม่สามารถโหลดรายชื่อพนักงานได้";
      setError(message);
      setEmployees([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStoreAssignments = async (employeeId: string) => {
    try {
      const response = await fetch(`/api/admin/employees/${employeeId}/stores`);
      if (!response.ok) {
        console.warn("Could not load store assignments");
        return { storeIds: [], primaryStoreId: "" };
      }
      const data = (await response.json()) as {
        success: boolean;
        assignments?: EmployeeStoreAssignment[];
      };
      if (!data.success || !data.assignments) {
        return { storeIds: [], primaryStoreId: "" };
      }
      const storeIds = data.assignments.map((a) => a.storeId);
      const primaryAssignment = data.assignments.find((a) => a.isPrimary);
      const primaryStoreId = primaryAssignment?.storeId ?? "";
      return { storeIds, primaryStoreId };
    } catch (err) {
      console.error("Error loading store assignments:", err);
      return { storeIds: [], primaryStoreId: "" };
    }
  };

  const saveStoreAssignments = async (
    employeeId: string,
    storeIds: string[],
    primaryStoreId: string,
  ) => {
    try {
      const response = await fetch(`/api/admin/employees/${employeeId}/stores`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeIds,
          primaryStoreId: primaryStoreId || null,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "ไม่สามารถบันทึกร้านค้าได้");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "ไม่สามารถบันทึกร้านค้าได้";
      throw new Error(message);
    }
  };

  const loadEmployeeTarget = async (employeeId: string) => {
    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const response = await fetch(
        `/api/admin/targets?employeeId=${employeeId}&month=${currentMonth}`
      );
      if (!response.ok) {
        console.warn("Could not load employee target");
        return { targetRevenuePC: "", targetQuantity: "" };
      }
      const data = (await response.json()) as {
        ok: boolean;
        targets?: Array<{
          target_revenue_pc: number | null;
          target_quantity: number | null;
        }>;
      };
      if (!data.ok || !data.targets || data.targets.length === 0) {
        return { targetRevenuePC: "", targetQuantity: "" };
      }
      const target = data.targets[0];
      return {
        targetRevenuePC: target.target_revenue_pc?.toString() ?? "",
        targetQuantity: target.target_quantity?.toString() ?? "",
      };
    } catch (err) {
      console.error("Error loading employee target:", err);
      return { targetRevenuePC: "", targetQuantity: "" };
    }
  };

  const saveEmployeeTarget = async (
    employeeId: string,
    employeeName: string,
    targetRevenuePC: string,
    targetQuantity: string,
  ) => {
    try {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const revenuePCNum = targetRevenuePC ? parseFloat(targetRevenuePC) : null;
      const quantityNum = targetQuantity ? parseFloat(targetQuantity) : null;

      if (!revenuePCNum) {
        throw new Error("กรุณาระบุเป้าหมายยอดขาย");
      }

      // Determine target type
      let targetType: "revenue" | "quantity" | "both" = "revenue";
      if (revenuePCNum && quantityNum) {
        targetType = "both";
      } else if (quantityNum) {
        targetType = "quantity";
      }

      // Check if target exists for this month
      const existingRes = await fetch(
        `/api/admin/targets?employeeId=${employeeId}&month=${currentMonth}`
      );
      const existingData = (await existingRes.json()) as {
        ok: boolean;
        targets?: Array<{ id: string }>;
      };

      if (existingData.ok && existingData.targets && existingData.targets.length > 0) {
        // Update existing target
        const targetId = existingData.targets[0].id;
        const response = await fetch(`/api/admin/targets/${targetId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetRevenuePC: revenuePCNum,
            targetQuantity: quantityNum,
            targetType,
          }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.message ?? "ไม่สามารถอัปเดตเป้าหมายได้");
        }
      } else {
        // Create new target
        const response = await fetch("/api/admin/targets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId,
            employeeName,
            targetMonth: currentMonth,
            targetType,
            targetRevenuePC: revenuePCNum,
            targetQuantity: quantityNum,
          }),
        });
        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.message ?? "ไม่สามารถสร้างเป้าหมายได้");
        }
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "ไม่สามารถบันทึกเป้าหมายได้";
      throw new Error(message);
    }
  };

  const handleCreate = async () => {
    const payload = buildPayload(newEmployee);
    if (!payload.name) {
      setError("กรุณาระบุชื่อพนักงาน");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "ไม่สามารถเพิ่มพนักงานได้");
      }
      const result = (await response.json()) as { ok: boolean; employee?: DraftEmployee };
      const createdEmployee = result.employee;

      // Save store assignments if any stores are selected
      if (createdEmployee && newEmployee.selectedStoreIds.length > 0) {
        try {
          await saveStoreAssignments(
            createdEmployee.id,
            newEmployee.selectedStoreIds,
            newEmployee.primaryStoreId,
          );
        } catch (storeErr) {
          // Don't fail the entire operation if store assignment fails
          console.error("Store assignment error:", storeErr);
          setError(
            "เพิ่มพนักงานสำเร็จแล้ว แต่ไม่สามารถบันทึกร้านค้าได้ กรุณาลองแก้ไขพนักงานอีกครั้ง",
          );
        }
      }

      // Save employee target for current month
      if (createdEmployee && newEmployee.targetRevenuePC) {
        try {
          await saveEmployeeTarget(
            createdEmployee.id,
            createdEmployee.name,
            newEmployee.targetRevenuePC,
            newEmployee.targetQuantity,
          );
        } catch (targetErr) {
          console.error("Target save error:", targetErr);
          // Don't fail the entire operation
          setError(
            "เพิ่มพนักงานสำเร็จแล้ว แต่ไม่สามารถบันทึกเป้าหมายได้ กรุณาลองแก้ไขพนักงานอีกครั้ง",
          );
        }
      }

      setNewEmployee(EMPTY_FORM);
      setSuccessMessage("เพิ่มรายชื่อพนักงานเรียบร้อย");
      await refreshEmployees();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "ไม่สามารถเพิ่มพนักงานได้";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (employee: DraftEmployee) => {
    setEditingId(employee.id);
    setIsLoadingAssignments(true);

    // Load store assignments
    const { storeIds, primaryStoreId } = await loadStoreAssignments(employee.id);

    // Load current month's target
    const { targetRevenuePC, targetQuantity } = await loadEmployeeTarget(employee.id);

    // Use primaryStoreId if available, otherwise fallback to employee.defaultStoreId
    const effectiveDefaultStoreId = primaryStoreId || employee.defaultStoreId || "";

    const draftData = {
      name: employee.name ?? "",
      employeeCode: employee.employeeCode ?? "",
      phone: employee.phone ?? "",
      regularDayOff: employee.regularDayOff ?? "",
      province: employee.province ?? "",
      region: employee.region ?? "",
      defaultStoreId: effectiveDefaultStoreId,
      selectedStoreIds: storeIds,
      primaryStoreId: primaryStoreId,
      targetRevenuePC: targetRevenuePC,
      targetQuantity: targetQuantity,
    };


    setEditingDraft(draftData);
    setIsLoadingAssignments(false);
  };

  const handleUpdate = async () => {
    if (!editingId || !editingDraft) return;
    const payload = buildPayload(editingDraft);
    if (!payload.name) {
      setError("กรุณาระบุชื่อพนักงาน");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      // Update employee data
      const response = await fetch(`/api/admin/employees/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "ไม่สามารถแก้ไขพนักงานได้");
      }

      const result = (await response.json()) as { ok: boolean; employee?: DraftEmployee };
      const updatedEmployee = result.employee;

      // Update store assignments
      try {
        await saveStoreAssignments(
          editingId,
          editingDraft.selectedStoreIds,
          editingDraft.primaryStoreId,
        );
      } catch (storeErr) {
        console.error("Store assignment error:", storeErr);
        setError(
          "แก้ไขข้อมูลพนักงานสำเร็จแล้ว แต่ไม่สามารถบันทึกร้านค้าได้ กรุณาลองแก้ไขอีกครั้ง",
        );
      }

      // Update employee target for current month
      if (updatedEmployee && editingDraft.targetRevenuePC) {
        try {
          await saveEmployeeTarget(
            updatedEmployee.id,
            updatedEmployee.name,
            editingDraft.targetRevenuePC,
            editingDraft.targetQuantity,
          );
        } catch (targetErr) {
          console.error("Target update error:", targetErr);
          // Don't fail the entire operation
          setError(
            "แก้ไขข้อมูลพนักงานสำเร็จแล้ว แต่ไม่สามารถบันทึกเป้าหมายได้ กรุณาลองแก้ไขอีกครั้ง",
          );
        }
      }

      setEditingId(null);
      setEditingDraft(null);
      setSuccessMessage("อัปเดตข้อมูลพนักงานเรียบร้อย");
      await refreshEmployees();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "ไม่สามารถแก้ไขพนักงานได้";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("ต้องการลบรายชื่อพนักงานนี้หรือไม่?")) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/employees/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "ไม่สามารถลบพนักงานได้");
      }
      setSuccessMessage("ลบรายชื่อพนักงานเรียบร้อย");
      await refreshEmployees();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "ไม่สามารถลบพนักงานได้";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const sortedEmployees = useMemo(
    () =>
      employees
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name, "th-TH")),
    [employees],
  );

  const onProvinceChange = (
    value: string,
    setState: (updater: (prev: EmployeeFormState) => EmployeeFormState) => void,
  ) => {
    const trimmed = value;
    const region = REGION_BY_PROVINCE.get(trimmed) ?? "";
    setState((prev) => ({
      ...prev,
      province: trimmed,
      region: region || prev.region,
    }));
  };

  function toggleStoreSelection(
    storeId: string,
    setState: React.Dispatch<React.SetStateAction<EmployeeFormState>>,
  ): void;
  function toggleStoreSelection(
    storeId: string,
    setState: React.Dispatch<React.SetStateAction<EmployeeFormState | null>>,
  ): void;
  function toggleStoreSelection(
    storeId: string,
    setState: React.Dispatch<React.SetStateAction<EmployeeFormState>> | React.Dispatch<React.SetStateAction<EmployeeFormState | null>>,
  ): void {
    (setState as React.Dispatch<React.SetStateAction<EmployeeFormState | null>>)((prev: EmployeeFormState | null) => {
      if (!prev) return prev;
      const isCurrentlySelected = prev.selectedStoreIds.includes(storeId);
      let newSelectedStoreIds: string[];
      let newPrimaryStoreId = prev.primaryStoreId;

      if (isCurrentlySelected) {
        // Remove store
        newSelectedStoreIds = prev.selectedStoreIds.filter((id) => id !== storeId);
        // If removing primary store, clear primary
        if (prev.primaryStoreId === storeId) {
          newPrimaryStoreId = "";
        }
      } else {
        // Add store
        newSelectedStoreIds = [...prev.selectedStoreIds, storeId];
      }

      return {
        ...prev,
        selectedStoreIds: newSelectedStoreIds,
        primaryStoreId: newPrimaryStoreId,
      };
    });
  }

  function setPrimaryStore(
    storeId: string,
    setState: React.Dispatch<React.SetStateAction<EmployeeFormState>>,
  ): void;
  function setPrimaryStore(
    storeId: string,
    setState: React.Dispatch<React.SetStateAction<EmployeeFormState | null>>,
  ): void;
  function setPrimaryStore(
    storeId: string,
    setState: React.Dispatch<React.SetStateAction<EmployeeFormState>> | React.Dispatch<React.SetStateAction<EmployeeFormState | null>>,
  ): void {
    (setState as React.Dispatch<React.SetStateAction<EmployeeFormState | null>>)((prev: EmployeeFormState | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        primaryStoreId: storeId,
        defaultStoreId: storeId, // Sync defaultStoreId with primaryStoreId
      };
    });
  }

  function renderStoreSelector(
    formState: EmployeeFormState,
    setState: React.Dispatch<React.SetStateAction<EmployeeFormState>>,
  ): React.ReactElement;
  function renderStoreSelector(
    formState: EmployeeFormState,
    setState: React.Dispatch<React.SetStateAction<EmployeeFormState | null>>,
  ): React.ReactElement;
  function renderStoreSelector(
    formState: EmployeeFormState,
    setState: React.Dispatch<React.SetStateAction<EmployeeFormState>> | React.Dispatch<React.SetStateAction<EmployeeFormState | null>>,
  ): React.ReactElement {
    if (isLoadingStores) {
      return (
        <div className="mt-1 form-input flex h-[52px] items-center justify-center text-xs text-slate-400">
          กำลังโหลดรายชื่อร้าน/หน่วยงาน...
        </div>
      );
    }

    if (stores.length === 0) {
      return (
        <div className="mt-1 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-600">
          ยังไม่มีข้อมูลร้าน/หน่วยงาน กรุณาเพิ่มก่อนกำหนดพื้นที่รับผิดชอบ
        </div>
      );
    }

    return (
      <div className="mt-2 space-y-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
        <p className="text-xs font-medium text-slate-600">
          เลือกร้านค้าที่รับผิดชอบ (เลือกได้หลายร้าน):
        </p>
        <div className="space-y-2">
          {stores.map((store) => {
            const isSelected = formState.selectedStoreIds.includes(store.id);
            const isPrimary = formState.primaryStoreId === store.id;
            const label = store.province
              ? `${store.name} (${store.province})`
              : store.name;

            return (
              <div
                key={store.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                <input
                  type="checkbox"
                  id={`store-${store.id}`}
                  checked={isSelected}
                  onChange={() => toggleStoreSelection(store.id, setState as React.Dispatch<React.SetStateAction<EmployeeFormState | null>>)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                />
                <label
                  htmlFor={`store-${store.id}`}
                  className="flex-1 text-sm text-slate-700 cursor-pointer"
                >
                  {label}
                </label>
                {isSelected && (
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id={`primary-${store.id}`}
                      name="primary-store"
                      checked={isPrimary}
                      onChange={() => setPrimaryStore(store.id, setState as React.Dispatch<React.SetStateAction<EmployeeFormState | null>>)}
                      className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    />
                    <label
                      htmlFor={`primary-${store.id}`}
                      className="text-xs font-medium text-emerald-600 cursor-pointer whitespace-nowrap"
                    >
                      ร้านหลัก
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {formState.selectedStoreIds.length > 0 && !formState.primaryStoreId && (
          <p className="text-xs text-amber-600 mt-2">
            💡 แนะนำ: เลือกร้านหลักสำหรับพนักงาน (คลิกวงกลม &ldquo;ร้านหลัก&rdquo;)
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-slate-900">
          จัดการรายชื่อพนักงาน
        </h1>
        <p className="text-sm text-slate-500">
          รายชื่อนี้จะใช้แสดงใน dropdown ของฟอร์มลงเวลาและบันทึกยอดขาย
        </p>
      </header>

      {error && (
        <div className="rounded-3xl border border-red-100 bg-red-50/90 px-5 py-3 text-sm text-red-600 shadow-inner">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/80 px-5 py-3 text-sm text-emerald-600 shadow-inner">
          {successMessage}
        </div>
      )}

      <section className="rounded-3xl border border-blue-100 bg-white/85 p-5 shadow-inner shadow-blue-100/50">
        <h2 className="text-sm font-semibold text-slate-800">
          เพิ่มพนักงานใหม่
        </h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600">
              ชื่อพนักงาน *
            </label>
            <input
              type="text"
              value={newEmployee.name}
              onChange={(event) =>
                setNewEmployee((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              className="mt-1 form-input"
              placeholder="เช่น สุรเดช ใจดี"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600">
              รหัสพนักงาน
            </label>
            <input
              type="text"
              value={newEmployee.employeeCode}
              onChange={(event) =>
                setNewEmployee((prev) => ({
                  ...prev,
                  employeeCode: event.target.value,
                }))
              }
              className="mt-1 form-input"
              placeholder="เช่น EMP001 (ไม่บังคับ)"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600">
              เบอร์โทรศัพท์
            </label>
            <input
              type="tel"
              value={newEmployee.phone}
              onChange={(event) =>
                setNewEmployee((prev) => ({
                  ...prev,
                  phone: event.target.value,
                }))
              }
              className="mt-1 form-input"
              placeholder="0xx-xxx-xxxx"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600">
              วันหยุดประจำ
            </label>
            <select
              value={newEmployee.regularDayOff}
              onChange={(event) =>
                setNewEmployee((prev) => ({
                  ...prev,
                  regularDayOff: event.target.value,
                }))
              }
              className="mt-1 form-input"
            >
              {DAY_OFF_OPTIONS.map((option) => (
                <option key={option || "none"} value={option}>
                  {option ? option : "— ไม่ระบุ —"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600">
              จังหวัด
            </label>
            <input
              list={provinceDatalistId}
              value={newEmployee.province}
              onChange={(event) =>
                onProvinceChange(event.target.value, setNewEmployee)
              }
              className="mt-1 form-input"
              placeholder="พิมพ์เพื่อค้นหา"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600">
              ภูมิภาค
            </label>
            <select
              value={newEmployee.region}
              onChange={(event) =>
                setNewEmployee((prev) => ({
                  ...prev,
                  region: event.target.value,
                }))
              }
              className="mt-1 form-input"
            >
              <option value="">— ไม่ระบุ —</option>
              {THAI_REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600">
              🎯 เป้าหมายยอดขายต่อเดือน (บาท) *
            </label>
            <input
              type="number"
              value={newEmployee.targetRevenuePC}
              onChange={(event) =>
                setNewEmployee((prev) => ({
                  ...prev,
                  targetRevenuePC: event.target.value,
                }))
              }
              className="mt-1 form-input"
              placeholder="เช่น 50000"
              min="0"
              step="1000"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600">
              🎯 เป้าหมายจำนวนขายต่อเดือน (ชิ้น)
            </label>
            <input
              type="number"
              value={newEmployee.targetQuantity}
              onChange={(event) =>
                setNewEmployee((prev) => ({
                  ...prev,
                  targetQuantity: event.target.value,
                }))
              }
              className="mt-1 form-input"
              placeholder="เช่น 100 (ไม่บังคับ)"
              min="0"
              step="10"
            />
          </div>
          <div className="md:col-span-2 xl:col-span-3">
            <label className="block text-xs font-semibold text-slate-600">
              ร้าน/หน่วยงานที่รับผิดชอบ
            </label>
            {renderStoreSelector(newEmployee, setNewEmployee)}
            {storeError && (
              <p className="mt-1 text-xs text-red-500">{storeError}</p>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleCreate}
            disabled={isSaving}
            className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_20px_60px_-45px_rgba(37,99,235,1)] transition hover:shadow-[0_24px_70px_-50px_rgba(37,99,235,1)] disabled:cursor-not-allowed disabled:opacity-70"
          >
            เพิ่มรายชื่อ
          </button>
          <button
            type="button"
            onClick={() => setNewEmployee(EMPTY_FORM)}
            className="text-xs font-semibold text-slate-500 underline-offset-4 hover:underline"
          >
            ล้างฟอร์ม
          </button>
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_24px_90px_-60px_rgba(37,99,235,0.35)]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">รายชื่อทั้งหมด</h2>
          <button
            type="button"
            onClick={() => void refreshEmployees()}
            className="text-xs font-semibold text-blue-600 underline-offset-4 hover:underline"
          >
            รีเฟรช
          </button>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-blue-200 px-4 py-6 text-center text-sm text-blue-500">
            กำลังโหลดข้อมูล...
          </div>
        ) : sortedEmployees.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-blue-200 px-4 py-6 text-center text-sm text-blue-500">
            ยังไม่มีข้อมูลพนักงาน เพิ่มรายชื่อเพื่อเริ่มต้นใช้งาน
          </div>
        ) : (
          <ul className="space-y-2 text-sm text-slate-600">
            {sortedEmployees.map((employee) => {
              const isEditing = editingId === employee.id && editingDraft;
              const assignedStore =
                employee.defaultStoreId && storeMap.has(employee.defaultStoreId)
                  ? storeMap.get(employee.defaultStoreId) ?? null
                  : null;
              return (
                <li
                  key={employee.id}
                  className="rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-[0_12px_40px_-30px_rgba(37,99,235,0.45)]"
                >
                  {isEditing && editingDraft ? (
                    <div className="space-y-3">
                      {isLoadingAssignments ? (
                        <div className="text-center py-4 text-sm text-slate-500">
                          กำลังโหลดข้อมูลร้านค้า...
                        </div>
                      ) : (
                        <>
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            <input
                              value={editingDraft.name}
                              onChange={(event) =>
                                setEditingDraft((prev) =>
                                  prev
                                    ? { ...prev, name: event.target.value }
                                    : prev,
                                )
                              }
                              className="form-input"
                              placeholder="ชื่อพนักงาน"
                            />
                            <input
                              value={editingDraft.employeeCode}
                              onChange={(event) =>
                                setEditingDraft((prev) =>
                                  prev
                                    ? { ...prev, employeeCode: event.target.value }
                                    : prev,
                                )
                              }
                              className="form-input"
                              placeholder="รหัสพนักงาน (ไม่บังคับ)"
                            />
                            <input
                              value={editingDraft.phone}
                              onChange={(event) =>
                                setEditingDraft((prev) =>
                                  prev
                                    ? { ...prev, phone: event.target.value }
                                    : prev,
                                )
                              }
                              className="form-input"
                              placeholder="เบอร์โทรศัพท์"
                            />
                            <select
                              value={editingDraft.regularDayOff}
                              onChange={(event) =>
                                setEditingDraft((prev) =>
                                  prev
                                    ? { ...prev, regularDayOff: event.target.value }
                                    : prev,
                                )
                              }
                              className="form-input"
                            >
                              {DAY_OFF_OPTIONS.map((option) => (
                                <option key={option || "none"} value={option}>
                                  {option ? option : "— ไม่ระบุ —"}
                                </option>
                              ))}
                            </select>
                            <input
                              list={provinceDatalistId}
                              value={editingDraft.province}
                              onChange={(event) =>
                                setEditingDraft((prev) => {
                                  if (!prev) return prev;
                                  const value = event.target.value;
                                  const region =
                                    REGION_BY_PROVINCE.get(value) ?? prev.region;
                                  return {
                                    ...prev,
                                    province: value,
                                    region,
                                  };
                                })
                              }
                              className="form-input"
                              placeholder="จังหวัด"
                            />
                            <select
                              value={editingDraft.region}
                              onChange={(event) =>
                                setEditingDraft((prev) =>
                                  prev
                                    ? { ...prev, region: event.target.value }
                                    : prev,
                                )
                              }
                              className="form-input"
                            >
                              <option value="">— ไม่ระบุ —</option>
                              {THAI_REGIONS.map((region) => (
                                <option key={region} value={region}>
                                  {region}
                                </option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={editingDraft.targetRevenuePC}
                              onChange={(event) =>
                                setEditingDraft((prev) =>
                                  prev
                                    ? { ...prev, targetRevenuePC: event.target.value }
                                    : prev,
                                )
                              }
                              className="form-input"
                              placeholder="เป้าหมายยอดขาย (บาท)"
                              min="0"
                              step="1000"
                            />
                            <input
                              type="number"
                              value={editingDraft.targetQuantity}
                              onChange={(event) =>
                                setEditingDraft((prev) =>
                                  prev
                                    ? { ...prev, targetQuantity: event.target.value }
                                    : prev,
                                )
                              }
                              className="form-input"
                              placeholder="เป้าหมายจำนวนขาย (ชิ้น)"
                              min="0"
                              step="10"
                            />
                            <div className="md:col-span-2 xl:col-span-3">
                              <label className="block text-xs font-semibold text-slate-600">
                                ร้าน/หน่วยงานที่รับผิดชอบ
                              </label>
                              {renderStoreSelector(editingDraft, setEditingDraft)}
                              {storeError && (
                                <p className="mt-1 text-xs text-red-500">{storeError}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleUpdate}
                              disabled={isSaving}
                              className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              บันทึก
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(null);
                                setEditingDraft(null);
                              }}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {employee.name}
                          {employee.employeeCode && (
                            <span className="ml-2 text-xs font-normal text-slate-500">
                              ({employee.employeeCode})
                            </span>
                          )}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                          {employee.phone && (
                            <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-1">
                              โทร {employee.phone}
                            </span>
                          )}
                          {employee.regularDayOff && (
                            <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1">
                              หยุดประจำ: {employee.regularDayOff}
                            </span>
                          )}
                          {employee.province && (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                              จังหวัด: {employee.province}
                            </span>
                          )}
                          {employee.region && (
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                              ภูมิภาค: {employee.region}
                            </span>
                          )}
                          {assignedStore && (
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1">
                              ร้านหลัก: {assignedStore.province
                                ? `${assignedStore.name} (${assignedStore.province})`
                                : assignedStore.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => void handleEdit(employee)}
                          className="rounded-full border border-blue-200 px-3 py-1 font-semibold text-blue-600 hover:bg-blue-50"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(employee.id)}
                          className="rounded-full border border-red-200 px-3 py-1 font-semibold text-red-600 hover:bg-red-50"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <datalist id={provinceDatalistId}>
        {THAI_PROVINCES.map((province) => (
          <option key={province.name} value={province.name}>
            {province.name}
          </option>
        ))}
      </datalist>
    </div>
  );
}
