"use client";

import { useEffect, useId, useMemo, useState, lazy, Suspense } from "react";
import type { StoreRecord } from "@/lib/configStore";
import { THAI_PROVINCES } from "@/lib/thaiGeography";
import type { LocationData } from "@/components/admin/StoreLocationPicker";

// Dynamically import the map picker to avoid SSR issues
const StoreLocationPicker = lazy(() => import("@/components/admin/StoreLocationPicker"));

type DraftStore = Pick<
  StoreRecord,
  "id" | "name" | "province" | "address" | "latitude" | "longitude" | "radius" | "createdAt" | "updatedAt"
>;

type StoreFormState = {
  name: string;
  province: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  radius: number | null;
};

type StoreFormErrors = Partial<Record<keyof StoreFormState, string>>;

const validateStoreForm = (form: StoreFormState): StoreFormErrors => {
  const errors: StoreFormErrors = {};
  const trimmedName = form.name.trim();
  const hasLatitude = typeof form.latitude === "number";
  const hasLongitude = typeof form.longitude === "number";
  const hasRadius = typeof form.radius === "number";

  if (!trimmedName) {
    errors.name = "กรุณาระบุชื่อร้าน/หน่วยงาน";
  }

  if (hasLatitude !== hasLongitude) {
    errors.latitude = "ต้องระบุพิกัดให้ครบทั้งละติจูดและลองจิจูด";
    errors.longitude = errors.latitude;
  }

  if (hasRadius && (!hasLatitude || !hasLongitude)) {
    errors.radius = "ต้องเลือกตำแหน่งบนแผนที่ก่อนกำหนดรัศมี";
  } else if (hasRadius && (form.radius ?? 0) <= 0) {
    errors.radius = "รัศมีต้องมากกว่า 0 เมตร";
  }

  return errors;
};

export default function StoresPage() {
  const [stores, setStores] = useState<DraftStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newStore, setNewStore] = useState<StoreFormState>({
    name: "",
    province: "",
    address: "",
    latitude: null,
    longitude: null,
    radius: null,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<StoreFormState | null>(null);
  const [createErrors, setCreateErrors] = useState<StoreFormErrors>({});
  const [editingErrors, setEditingErrors] = useState<StoreFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapPickerMode, setMapPickerMode] = useState<"create" | "edit">("create");

  const rawProvinceListId = useId();
  const provinceDatalistId = `${rawProvinceListId}-store-province-options`.replace(/:/g, "-");

  useEffect(() => {
    void refreshStores();
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const refreshStores = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/stores");
      if (!response.ok) {
        throw new Error("ไม่สามารถโหลดรายชื่อร้าน/หน่วยงานได้");
      }
      const data = (await response.json()) as { stores?: DraftStore[] };
      setStores(Array.isArray(data.stores) ? data.stores : []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "ไม่สามารถโหลดรายชื่อร้าน/หน่วยงานได้";
      setError(message);
      setStores([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    const trimmedName = newStore.name.trim();
    const validationErrors = validateStoreForm(newStore);
    if (Object.keys(validationErrors).length > 0) {
      setCreateErrors(validationErrors);
      return;
    }
    setCreateErrors({});
    const payload = {
      name: trimmedName,
      province: newStore.province.trim() || undefined,
      address: newStore.address.trim() || undefined,
      latitude: newStore.latitude,
      longitude: newStore.longitude,
      radius: newStore.radius,
    };
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "ไม่สามารถเพิ่มร้าน/หน่วยงานได้");
      }
      setNewStore({
        name: "",
        province: "",
        address: "",
        latitude: null,
        longitude: null,
        radius: null,
      });
      setCreateErrors({});
      setSuccessMessage("เพิ่มร้าน/หน่วยงานเรียบร้อย");
      await refreshStores();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "ไม่สามารถเพิ่มร้าน/หน่วยงานได้";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (store: DraftStore) => {
    setEditingId(store.id);
    setEditingDraft({
      name: store.name ?? "",
      province: store.province ?? "",
      address: store.address ?? "",
      latitude: store.latitude ?? null,
      longitude: store.longitude ?? null,
      radius: store.radius ?? null,
    });
  };

  const handleUpdate = async (id: string) => {
    if (!editingDraft) return;
    const trimmedName = editingDraft.name.trim();
    const validationErrors = validateStoreForm(editingDraft);
    if (Object.keys(validationErrors).length > 0) {
      setEditingErrors(validationErrors);
      return;
    }
    setEditingErrors({});
    const payload = {
      name: trimmedName,
      province: editingDraft.province.trim() || undefined,
      address: editingDraft.address.trim() || undefined,
      latitude: editingDraft.latitude,
      longitude: editingDraft.longitude,
      radius: editingDraft.radius,
    };
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/stores/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "ไม่สามารถแก้ไขร้าน/หน่วยงานได้");
      }
      setEditingId(null);
      setEditingDraft(null);
      setEditingErrors({});
      setSuccessMessage("อัปเดตร้าน/หน่วยงานเรียบร้อย");
      await refreshStores();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "ไม่สามารถแก้ไขร้าน/หน่วยงานได้";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("ต้องการลบร้าน/หน่วยงานนี้หรือไม่?")) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/stores/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "ไม่สามารถลบร้าน/หน่วยงานได้");
      }
      setSuccessMessage("ลบร้าน/หน่วยงานเรียบร้อย");
      await refreshStores();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "ไม่สามารถลบร้าน/หน่วยงานได้";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenMapPicker = (mode: "create" | "edit") => {
    setMapPickerMode(mode);
    setShowMapPicker(true);
  };

  const handleLocationChange = (location: LocationData | null) => {
    if (mapPickerMode === "create") {
      setNewStore((prev) => ({
        ...prev,
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        radius: location?.radius ?? null,
        address: location?.address ?? prev.address,
      }));
      setCreateErrors((prev) => ({
        ...prev,
        latitude: undefined,
        longitude: undefined,
        radius: undefined,
      }));
    } else if (editingDraft) {
      setEditingDraft((prev) =>
        prev
          ? {
              ...prev,
              latitude: location?.latitude ?? null,
              longitude: location?.longitude ?? null,
              radius: location?.radius ?? null,
              address: location?.address ?? prev.address,
            }
          : prev,
      );
      setEditingErrors((prev) => ({
        ...prev,
        latitude: undefined,
        longitude: undefined,
        radius: undefined,
      }));
    }
  };

  const sortedStores = useMemo(
    () => stores.slice().sort((a, b) => a.name.localeCompare(b.name, "th-TH")),
    [stores],
  );

  const currentLocationData =
    mapPickerMode === "create"
      ? newStore.latitude && newStore.longitude
        ? {
            latitude: newStore.latitude,
            longitude: newStore.longitude,
            radius: newStore.radius ?? 100,
            address: newStore.address,
          }
        : null
      : editingDraft?.latitude && editingDraft?.longitude
        ? {
            latitude: editingDraft.latitude,
            longitude: editingDraft.longitude,
            radius: editingDraft.radius ?? 100,
            address: editingDraft.address,
          }
        : null;

  return (
    <>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-xl font-semibold text-slate-900">จัดการร้านค้า / หน่วยงาน</h1>
          <p className="text-sm text-slate-500">
            รายชื่อนี้จะแสดงใน dropdown ของฟอร์มบันทึกยอดขายและฟอร์มลงเวลา
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
          <h2 className="text-sm font-semibold text-slate-800">เพิ่มร้าน/หน่วยงานใหม่</h2>
          <div className="mt-3 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600">
                  ชื่อร้านค้า / หน่วยงาน *
                </label>
                <input
                  type="text"
                  value={newStore.name}
                  onChange={(event) => {
                    const value = event.target.value;
                    setNewStore((prev) => ({
                      ...prev,
                      name: value,
                    }));
                    setCreateErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  className="mt-1 form-input"
                  placeholder="เช่น ร้าน A สาขาเชียงใหม่"
                />
                {createErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{createErrors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">จังหวัด</label>
                <input
                  list={provinceDatalistId}
                  value={newStore.province}
                  onChange={(event) => {
                    const value = event.target.value;
                    setNewStore((prev) => ({
                      ...prev,
                      province: value,
                    }));
                  }}
                  className="mt-1 form-input"
                  placeholder="พิมพ์เพื่อค้นหา"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600">ที่อยู่</label>
              <input
                type="text"
                value={newStore.address}
                onChange={(event) => {
                  const value = event.target.value;
                  setNewStore((prev) => ({
                    ...prev,
                    address: value,
                  }));
                }}
                className="mt-1 form-input"
                placeholder="ที่อยู่เต็มของร้าน"
              />
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-700">ตำแหน่งบนแผนที่</p>
                  {newStore.latitude && newStore.longitude ? (
                    <p className="mt-1 text-xs text-slate-500">
                      {newStore.latitude.toFixed(6)}, {newStore.longitude.toFixed(6)} (รัศมี:{" "}
                      {newStore.radius ?? 100}m)
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-slate-500">ยังไม่ได้ระบุตำแหน่ง</p>
                  )}
                  {newStore.address && (
                    <p className="mt-1 text-xs text-slate-500">{newStore.address}</p>
                  )}
                  {newStore.latitude && newStore.longitude && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${newStore.latitude},${newStore.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 underline-offset-4 hover:underline"
                    >
                      เปิดใน Google Maps
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenMapPicker("create")}
                  className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  {newStore.latitude && newStore.longitude ? "แก้ไขตำแหน่ง" : "เลือกบนแผนที่"}
                </button>
              </div>
              {createErrors.latitude && (
                <p className="mt-2 text-xs text-red-600">{createErrors.latitude}</p>
              )}
              {createErrors.radius && (
                <p className="text-xs text-red-600">{createErrors.radius}</p>
              )}
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
              <button
                type="button"
                onClick={handleCreate}
                disabled={isSaving}
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 via-sky-500 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_20px_60px_-45px_rgba(37,99,235,1)] transition hover:shadow-[0_24px_70px_-50px_rgba(37,99,235,1)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                เพิ่มร้าน/หน่วยงาน
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewStore({
                    name: "",
                    province: "",
                    address: "",
                    latitude: null,
                    longitude: null,
                    radius: null,
                  });
                  setCreateErrors({});
                  setError(null);
                }}
                className="text-xs font-semibold text-slate-500 underline-offset-4 hover:underline"
              >
                ล้างฟอร์ม
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_24px_90px_-60px_rgba(37,99,235,0.35)]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">รายการทั้งหมด</h2>
            <div className="flex gap-2">
              <a
                href="/admin/stores/map"
                className="text-xs font-semibold text-emerald-600 underline-offset-4 hover:underline"
              >
                ดูแผนที่ทั้งหมด
              </a>
              <button
                type="button"
                onClick={() => void refreshStores()}
                className="text-xs font-semibold text-blue-600 underline-offset-4 hover:underline"
              >
                รีเฟรช
              </button>
            </div>
          </div>

          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-blue-200 px-4 py-6 text-center text-sm text-blue-500">
              กำลังโหลดข้อมูล...
            </div>
          ) : sortedStores.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-blue-200 px-4 py-6 text-center text-sm text-blue-500">
              ยังไม่มีข้อมูลร้าน/หน่วยงาน เพิ่มรายการใหม่เพื่อใช้งานในฟอร์ม
            </div>
          ) : (
            <ul className="space-y-2 text-sm text-slate-600">
              {sortedStores.map((store) => {
                const isEditing = editingId === store.id && editingDraft;
                return (
                  <li
                    key={store.id}
                    className="rounded-2xl border border-blue-100 bg-white px-4 py-3 shadow-[0_12px_40px_-30px_rgba(37,99,235,0.45)]"
                  >
                    {isEditing && editingDraft ? (
                      <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <input
                            value={editingDraft.name}
                            onChange={(event) => {
                              const value = event.target.value;
                              setEditingDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      name: value,
                                    }
                                  : prev,
                              );
                              setEditingErrors((prev) => ({ ...prev, name: undefined }));
                            }}
                            className="form-input"
                            placeholder="ชื่อร้านค้า / หน่วยงาน"
                          />
                          <input
                            list={provinceDatalistId}
                            value={editingDraft.province}
                            onChange={(event) => {
                              const value = event.target.value;
                              setEditingDraft((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      province: value,
                                    }
                                  : prev,
                              );
                            }}
                            className="form-input"
                            placeholder="จังหวัด"
                          />
                        </div>
                        {editingErrors.name && (
                          <p className="text-xs text-red-600">{editingErrors.name}</p>
                        )}
                        <input
                          value={editingDraft.address}
                          onChange={(event) => {
                            const value = event.target.value;
                            setEditingDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    address: value,
                                  }
                                : prev,
                            );
                          }}
                          className="form-input"
                          placeholder="ที่อยู่"
                        />
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-semibold text-slate-700">
                                ตำแหน่งบนแผนที่
                              </p>
                              {editingDraft.latitude && editingDraft.longitude ? (
                                <p className="mt-1 text-xs text-slate-500">
                                  {editingDraft.latitude.toFixed(6)},{" "}
                                  {editingDraft.longitude.toFixed(6)} (รัศมี:{" "}
                                  {editingDraft.radius ?? 100}m)
                                </p>
                              ) : (
                                <p className="mt-1 text-xs text-slate-500">ยังไม่ได้ระบุตำแหน่ง</p>
                              )}
                              {editingDraft.address && (
                                <p className="mt-1 text-xs text-slate-500">{editingDraft.address}</p>
                              )}
                              {editingDraft.latitude && editingDraft.longitude && (
                                <a
                                  href={`https://www.google.com/maps/search/?api=1&query=${editingDraft.latitude},${editingDraft.longitude}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 underline-offset-4 hover:underline"
                                >
                                  เปิดใน Google Maps
                                </a>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenMapPicker("edit")}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                            >
                              {editingDraft.latitude && editingDraft.longitude
                                ? "แก้ไข"
                                : "เลือก"}
                            </button>
                          </div>
                          {editingErrors.latitude && (
                            <p className="mt-2 text-xs text-red-600">{editingErrors.latitude}</p>
                          )}
                          {editingErrors.radius && (
                            <p className="text-xs text-red-600">{editingErrors.radius}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleUpdate(store.id)}
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
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-semibold text-slate-800">{store.name}</p>
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                            {store.province && (
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1">
                                จังหวัด: {store.province}
                              </span>
                            )}
                            {store.latitude && store.longitude && (
                              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1">
                                มีตำแหน่งบนแผนที่ (รัศมี: {store.radius ?? 100}m)
                              </span>
                            )}
                            <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-1 text-slate-500">
                              อัปเดต {new Date(store.updatedAt).toLocaleString("th-TH")}
                            </span>
                          </div>
                          {store.address && (
                            <p className="mt-1 text-xs text-slate-500">{store.address}</p>
                          )}
                          {store.latitude && store.longitude && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${store.latitude},${store.longitude}`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 underline-offset-4 hover:underline"
                            >
                              เปิดตำแหน่งใน Google Maps
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => handleEdit(store)}
                            className="rounded-full border border-blue-200 px-3 py-1 font-semibold text-blue-600 hover:bg-blue-50"
                          >
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(store.id)}
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

      {/* Map Picker Modal */}
      {showMapPicker && (
        <Suspense fallback={<div>Loading map...</div>}>
          <StoreLocationPicker
            initialLocation={currentLocationData}
            onLocationChange={handleLocationChange}
            onClose={() => setShowMapPicker(false)}
          />
        </Suspense>
      )}
    </>
  );
}
