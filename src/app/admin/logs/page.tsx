"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import type { LogEntry, LogScope } from "@/lib/configStore";
import { Database, MapPin, Download, RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";

const SCOPE_OPTIONS: Array<{ label: string; value: "all" | LogScope }> = [
  { label: "ทั้งหมด", value: "all" },
  { label: "Attendance", value: "attendance" },
  { label: "Sales", value: "sales" },
  { label: "Employees", value: "employee" },
  { label: "Products", value: "product" },
  { label: "System", value: "system" },
];

type BackupFile = {
  name: string;
  timestamp: string;
  timestampFormatted: string;
};

type BackupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: BackupFile[] }
  | { status: "error"; message: string };

type RestoreState =
  | { status: "idle" }
  | { status: "loading"; backupName: string }
  | { status: "success"; backupName: string }
  | { status: "error"; backupName: string; message: string };

export default function LogsPage() {
  const queryClient = useQueryClient();

  // Logs state
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [scopeFilter, setScopeFilter] = useState<"all" | LogScope>("all");

  // GPS state
  const [isGPSEnabled, setIsGPSEnabled] = useState(true);
  const [isSavingGPS, setIsSavingGPS] = useState(false);
  const [gpsSuccessMessage, setGPSSuccessMessage] = useState<string | null>(null);
  const [gpsErrorMessage, setGPSErrorMessage] = useState<string | null>(null);

  // Backups state
  const [backupState, setBackupState] = useState<BackupState>({ status: "idle" });
  const [restoreState, setRestoreState] = useState<RestoreState>({ status: "idle" });

  // Fetch logs
  useEffect(() => {
    void refreshLogs();
  }, []);

  const refreshLogs = async () => {
    setIsLoadingLogs(true);
    setLogsError(null);
    try {
      const response = await fetch("/api/admin/logs?limit=100");
      if (!response.ok) {
        throw new Error("ไม่สามารถโหลด Logs ได้");
      }
      const data = (await response.json()) as { logs: LogEntry[] };
      setLogs(data.logs ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "ไม่สามารถโหลด Logs ได้";
      setLogsError(message);
      setLogs([]);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const filteredLogs = useMemo(() => {
    if (scopeFilter === "all") return logs;
    return logs.filter((log) => log.scope === scopeFilter);
  }, [logs, scopeFilter]);

  // Fetch GPS settings
  const { data: gpsSettings, isLoading: isLoadingGPS } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json() as Promise<{ gps_required?: boolean }>;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (gpsSettings && gpsSettings.gps_required !== undefined) {
      setIsGPSEnabled(gpsSettings.gps_required);
    }
  }, [gpsSettings]);

  // Auto-dismiss GPS success message
  useEffect(() => {
    if (!gpsSuccessMessage) return;
    const timer = setTimeout(() => setGPSSuccessMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [gpsSuccessMessage]);

  // GPS save mutation
  const saveGPSMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "gps_required",
          value: enabled,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save setting");
      }
      return res.json();
    },
    onSuccess: () => {
      setGPSSuccessMessage("บันทึกการตั้งค่า GPS เรียบร้อย");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: Error) => {
      setGPSErrorMessage(error.message);
    },
  });

  const handleGPSToggle = () => {
    setIsGPSEnabled(!isGPSEnabled);
  };

  const handleGPSSave = async () => {
    setIsSavingGPS(true);
    setGPSErrorMessage(null);
    try {
      await saveGPSMutation.mutateAsync(isGPSEnabled);
    } finally {
      setIsSavingGPS(false);
    }
  };

  // Fetch backups
  const fetchBackups = useCallback(async () => {
    setBackupState({ status: "loading" });
    try {
      const response = await fetch("/api/admin/backups");
      const result = (await response.json()) as { ok: boolean; data: BackupFile[]; message?: string };

      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "ไม่สามารถดึงรายการสำรองข้อมูลได้");
      }

      setBackupState({ status: "success", data: result.data });
    } catch (error) {
      const message = error instanceof Error ? error.message : "ไม่สามารถดึงรายการสำรองข้อมูลได้";
      setBackupState({ status: "error", message });
    }
  }, []);

  useEffect(() => {
    void fetchBackups();
  }, [fetchBackups]);

  const handleRestore = async (backupName: string) => {
    if (
      !confirm(
        `⚠️ คุณแน่ใจหรือไม่ที่จะกู้คืนข้อมูลจาก:\n\n${backupName}\n\nข้อมูลปัจจุบันจะถูกสำรองก่อนกู้คืน`
      )
    ) {
      return;
    }

    setRestoreState({ status: "loading", backupName });
    try {
      const response = await fetch("/api/admin/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupName }),
      });

      const result = (await response.json()) as { ok: boolean; message?: string };

      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "ไม่สามารถกู้คืนข้อมูลได้");
      }

      setRestoreState({ status: "success", backupName });

      // Reload after 1.5 seconds
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : "ไม่สามารถกู้คืนข้อมูลได้";
      setRestoreState({ status: "error", backupName, message });
    }
  };

  const backupList = backupState.status === "success" ? backupState.data : [];
  const isLoadingBackups = backupState.status === "loading";
  const hasBackupError = backupState.status === "error";

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-slate-900">ระบบ Logs & การตั้งค่า</h1>
        <p className="text-sm text-slate-500">
          ตรวจสอบกิจกรรม, จัดการการใช้งาน GPS และสำรองข้อมูล
        </p>
      </header>

      {/* GPS Settings Section */}
      <section className="space-y-4 rounded-3xl border border-emerald-100 bg-white/90 p-5 shadow-[0_24px_90px_-60px_rgba(16,185,129,0.35)]">
        <div className="flex items-center gap-3 border-b border-emerald-100 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
            <MapPin className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">การใช้งาน GPS</h2>
            <p className="text-xs text-slate-500">
              กำหนดว่าจะบังคับให้ใช้พิกัด GPS ในการลงเวลาและบันทึกยอดขายหรือไม่
            </p>
          </div>
        </div>

        {isLoadingGPS ? (
          <div className="flex items-center justify-center py-8">
            <div className="inline-flex h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-b-transparent" />
            <span className="ml-3 text-sm text-slate-500">กำลังโหลดการตั้งค่า...</span>
          </div>
        ) : (
          <>
            {gpsErrorMessage && (
              <div className="rounded-2xl border border-red-100 bg-red-50/90 px-4 py-3 text-sm text-red-600">
                {gpsErrorMessage}
              </div>
            )}

            {gpsSuccessMessage && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-600">
                {gpsSuccessMessage}
              </div>
            )}

            <div className="space-y-4 rounded-2xl border border-emerald-100 bg-white p-5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label htmlFor="gps-toggle" className="block text-sm font-semibold text-slate-700">
                    บังคับใช้ GPS
                  </label>
                  <p className="mt-1 text-xs text-slate-500">
                    {isGPSEnabled
                      ? "พนักงานต้องเปิด GPS และอยู่ในพื้นที่กำหนดเพื่อลงเวลา"
                      : "พนักงานสามารถเลือกร้านค้าด้วยตนเองโดยไม่ต้องใช้ GPS"}
                  </p>
                </div>
                <button
                  type="button"
                  id="gps-toggle"
                  onClick={handleGPSToggle}
                  className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                    isGPSEnabled ? "bg-emerald-600" : "bg-slate-300"
                  }`}
                  role="switch"
                  aria-checked={isGPSEnabled}
                >
                  <span
                    className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isGPSEnabled ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  📋 รายละเอียด
                </h4>
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  <li className="flex gap-2">
                    <span className="text-emerald-500">•</span>
                    <span>
                      <strong>เปิด GPS:</strong> พนักงานต้องอยู่ในรัศมีที่กำหนดของร้านค้า
                      ระบบจะตรวจสอบตำแหน่งอัตโนมัติ
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-emerald-500">•</span>
                    <span>
                      <strong>ปิด GPS:</strong> พนักงานเลือกร้านค้าจาก dropdown
                      เหมาะสำหรับพื้นที่ที่ GPS ใช้งานไม่ได้
                    </span>
                  </li>
                </ul>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleGPSSave}
                  disabled={isSavingGPS}
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_20px_60px_-45px_rgba(16,185,129,1)] transition hover:shadow-[0_24px_70px_-50px_rgba(16,185,129,1)] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSavingGPS ? "กำลังบันทึก..." : "บันทึกการตั้งค่า"}
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Data Backup Section */}
      <section className="space-y-4 rounded-3xl border border-purple-100 bg-white/90 p-5 shadow-[0_24px_90px_-60px_rgba(147,51,234,0.35)]">
        <div className="flex items-start justify-between gap-6 border-b border-purple-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/30">
              <Database className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">สำรองข้อมูลอัตโนมัติ</h2>
              <p className="text-xs text-slate-500">จัดการและกู้คืนข้อมูลที่สำรองไว้</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void fetchBackups()}
            disabled={isLoadingBackups}
            className="inline-flex items-center gap-2 rounded-2xl border border-purple-200 bg-white px-4 py-2 text-sm font-medium text-purple-700 transition hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingBackups ? "animate-spin" : ""}`} />
            รีเฟรช
          </button>
        </div>

        {hasBackupError && backupState.status === "error" && (
          <div className="rounded-2xl border border-red-100 bg-red-50/90 px-4 py-3 text-sm text-red-600">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{backupState.message}</span>
            </div>
          </div>
        )}

        {restoreState.status === "success" && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-600">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
              <span>กู้คืนข้อมูลสำเร็จ กำลังโหลดหน้าใหม่...</span>
            </div>
          </div>
        )}

        {restoreState.status === "error" && (
          <div className="rounded-2xl border border-red-100 bg-red-50/90 px-4 py-3 text-sm text-red-600">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{restoreState.message}</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {isLoadingBackups ? (
            <div className="flex items-center justify-center py-8">
              <div className="inline-flex h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-b-transparent" />
              <span className="ml-3 text-sm text-slate-500">กำลังโหลดรายการสำรองข้อมูล...</span>
            </div>
          ) : backupList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-purple-200 bg-purple-50/30 px-5 py-8 text-center">
              <Database className="mx-auto h-12 w-12 text-purple-300" />
              <p className="mt-3 text-sm font-medium text-purple-700">ไม่พบไฟล์สำรองข้อมูล</p>
              <p className="mt-1 text-xs text-purple-600">
                ระบบจะสำรองข้อมูลอัตโนมัติทุกครั้งที่มีการแก้ไข
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {backupList.map((backup) => {
                const isRestoring = restoreState.status === "loading" && restoreState.backupName === backup.name;

                return (
                  <div
                    key={backup.name}
                    className="flex items-center justify-between rounded-2xl border border-purple-100 bg-white px-4 py-3 transition hover:border-purple-200 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-50">
                        <Clock className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{backup.name}</p>
                        <p className="text-xs text-slate-500">{backup.timestampFormatted}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestore(backup.name)}
                      disabled={restoreState.status === "loading"}
                      className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_20px_60px_-45px_rgba(147,51,234,1)] transition hover:shadow-[0_24px_70px_-50px_rgba(147,51,234,1)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isRestoring ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          กู้คืน...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          กู้คืน
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-purple-700">
            ℹ️ หมายเหตุ
          </h4>
          <ul className="mt-2 space-y-1 text-xs text-slate-600">
            <li className="flex gap-2">
              <span className="text-purple-500">•</span>
              <span>ระบบสำรองข้อมูลอัตโนมัติทุกครั้งที่มีการแก้ไขข้อมูลสำคัญ</span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-500">•</span>
              <span>การกู้คืนจะสำรองข้อมูลปัจจุบันก่อนแทนที่ด้วยไฟล์สำรอง</span>
            </li>
            <li className="flex gap-2">
              <span className="text-purple-500">•</span>
              <span>แนะนำให้ดาวน์โหลดสำรองข้อมูลที่สำคัญเก็บไว้ที่เครื่องของคุณด้วย</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Logs Section */}
      <section className="space-y-4 rounded-3xl border border-blue-100 bg-white/90 p-5 shadow-[0_24px_90px_-60px_rgba(37,99,235,0.35)]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">ประวัติกิจกรรม (Logs)</h2>
          <button
            type="button"
            onClick={() => void refreshLogs()}
            className="inline-flex items-center rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-[0_20px_60px_-45px_rgba(37,99,235,1)] transition hover:shadow-[0_24px_70px_-50px_rgba(37,99,235,1)]"
          >
            รีเฟรช
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={scopeFilter}
            onChange={(event) =>
              setScopeFilter(event.target.value as "all" | LogScope)
            }
            className="form-input max-w-[200px]"
          >
            {SCOPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {logsError && (
          <div className="rounded-3xl border border-red-100 bg-red-50/90 px-5 py-3 text-sm text-red-600 shadow-inner">
            {logsError}
          </div>
        )}

        {isLoadingLogs ? (
          <p className="text-sm text-slate-500">กำลังโหลดข้อมูล...</p>
        ) : filteredLogs.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-blue-200 px-4 py-3 text-xs text-blue-500">
            ไม่พบข้อมูลในช่วงที่เลือก
          </p>
        ) : (
          <ul className="space-y-2">
            {filteredLogs.map((log) => (
              <li
                key={log.id}
                className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-600"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-700">{log.message}</p>
                    <p className="text-xs text-slate-400">
                      ประเภท: {log.scope} • กิจกรรม: {log.action}
                    </p>
                    {log.meta && (
                      <details className="mt-2 text-xs text-slate-500">
                        <summary className="cursor-pointer text-blue-500">
                          รายละเอียดเพิ่มเติม
                        </summary>
                        <pre className="mt-2 rounded-2xl bg-slate-50 px-3 py-2">
                          {JSON.stringify(log.meta, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(log.timestamp).toLocaleString("th-TH")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
