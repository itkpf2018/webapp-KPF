'use client';

import { useMemo, useState } from "react";

export type PerformanceExplorerData = {
  timeline: Array<{
    dateKey: string;
    label: string;
    iso: string;
    salesTotal: number;
    salesAverage: number;
    salesQuantity: number;
    salesCount: number;
    checkIns: number;
    checkOuts: number;
  }>;
  weekly: Array<{
    label: string;
    startIso: string;
    endIso: string;
    salesTotal: number;
    salesQuantity: number;
    checkIns: number;
  }>;
  segments: {
    store: Array<{
      id: string;
      label: string;
      salesTotal: number;
      salesCount: number;
      salesQuantity: number;
      checkIns: number;
      checkOuts: number;
      activeEmployees: number;
    }>;
    employee: Array<{
      id: string;
      label: string;
      checkIns: number;
      checkOuts: number;
      stores: string[];
    }>;
  };
  metadata: {
    lookbackDays: number;
    timeZone: string;
    generatedAt: string;
  };
};

type Granularity = "daily" | "weekly";
type Focus = "sales" | "attendance";
type Dimension = "store" | "employee";

type PresetConfig = {
  id: string;
  label: string;
  description: string;
  dimension: Dimension;
  focus: Focus;
  filter?: {
    minSalesTotal?: number;
    minCheckIns?: number;
  };
};

const currencyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

const currencyDetailedFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("th-TH", {
  maximumFractionDigits: 0,
});

const presets: PresetConfig[] = [
  {
    id: "executive",
    label: "ภาพรวมผู้บริหาร",
    description: "ยอดขายและเช็กอินรวมทุกสาขา",
    dimension: "store",
    focus: "sales",
  },
  {
    id: "marketing",
    label: "หัวหน้าการตลาด",
    description: "จัดอันดับสาขาตามยอดขายล่าสุด",
    dimension: "store",
    focus: "sales",
    filter: { minSalesTotal: 1 },
  },
];

export function PerformanceExplorer({ data }: { data: PerformanceExplorerData }) {
  const defaultDimension: Dimension =
    data.segments.store.length > 0 ? "store" : "employee";
  const defaultPreset = presets.find((preset) => preset.dimension === defaultDimension);
  const defaultFocus: Focus = defaultPreset?.focus ?? "sales";

  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [focus, setFocus] = useState<Focus>(defaultFocus);
  const [dimension, setDimension] = useState<Dimension>(defaultDimension);
  const [activePresetId, setActivePresetId] = useState<string>(
    defaultPreset?.id ?? "custom",
  );

  const availableDimensions = useMemo(() => {
    const options: Array<{ id: Dimension; label: string }> = [];
    if (data.segments.store.length > 0) {
      options.push({ id: "store", label: "ตามสาขา" });
    }
    if (data.segments.employee.length > 0) {
      options.push({ id: "employee", label: "ตามพนักงาน" });
    }
    return options;
  }, [data.segments.employee.length, data.segments.store.length]);

  const timelinePoints = useMemo(() => {
    if (granularity === "weekly" && data.weekly.length > 0) {
      return data.weekly.map((point) => ({
        key: point.label,
        label: point.label,
        salesTotal: point.salesTotal,
        salesQuantity: point.salesQuantity,
        checkIns: point.checkIns,
      }));
    }
    return data.timeline.map((point) => ({
      key: point.dateKey,
      label: point.label,
      salesTotal: point.salesTotal,
      salesQuantity: point.salesQuantity,
      checkIns: point.checkIns,
    }));
  }, [data.timeline, data.weekly, granularity]);

  const availablePresetConfigs = useMemo(
    () =>
      presets.filter((preset) =>
        preset.dimension === "store"
          ? data.segments.store.length > 0
          : data.segments.employee.length > 0,
      ),
    [data.segments.employee.length, data.segments.store.length],
  );

  const allSegments = useMemo(() => {
    const preset = presets.find((item) => item.id === activePresetId);
    const activePreset =
      preset && preset.dimension === dimension ? preset : undefined;

    if (dimension === "store") {
      let segments = data.segments.store.slice();
      if (activePreset?.filter) {
        const { minSalesTotal, minCheckIns } = activePreset.filter;
        if (typeof minSalesTotal === "number") {
          segments = segments.filter((segment) => segment.salesTotal >= minSalesTotal);
        }
        if (typeof minCheckIns === "number") {
          segments = segments.filter((segment) => segment.checkIns >= minCheckIns);
        }
      }
      const sorted = segments.sort((a, b) => {
        if (focus === "sales") {
          return b.salesTotal - a.salesTotal;
        }
        return b.checkIns - a.checkIns;
      });
      return sorted.slice(0, 8);
    }

    let segments = data.segments.employee.slice();
    const minCheckIns = activePreset?.filter?.minCheckIns;
    if (typeof minCheckIns === "number") {
      segments = segments.filter((segment) => segment.checkIns >= minCheckIns);
    }
    const sorted = segments.sort((a, b) => b.checkIns - a.checkIns);
    return sorted.slice(0, 8);
  }, [activePresetId, data.segments.employee, data.segments.store, dimension, focus]);

  const maxSales = useMemo(
    () => Math.max(...timelinePoints.map((point) => point.salesTotal), 0),
    [timelinePoints],
  );
  const maxCheckIns = useMemo(
    () => Math.max(...timelinePoints.map((point) => point.checkIns), 0),
    [timelinePoints],
  );

  const handleGranularityChange = (next: Granularity) => {
    setGranularity(next);
    setActivePresetId("custom");
  };

  const handleFocusChange = (next: Focus) => {
    setFocus(next);
    setActivePresetId("custom");
  };

  const handleDimensionChange = (next: Dimension) => {
    setDimension(next);
    const presetMatch = availablePresetConfigs.find((preset) => preset.dimension === next);
    if (presetMatch) {
      setActivePresetId(presetMatch.id);
      setFocus(presetMatch.focus);
    } else {
      setActivePresetId("custom");
    }
  };

  const handlePresetSelect = (preset: PresetConfig) => {
    setDimension(preset.dimension);
    setFocus(preset.focus);
    setActivePresetId(preset.id);
  };

  return (
    <section className="space-y-5 rounded-3xl border border-blue-100 bg-white/80 p-6 shadow-[0_40px_150px_-120px_rgba(59,130,246,0.55)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-500">
            Trends &amp; Segmentation
          </p>
          <h2 className="text-lg font-semibold text-slate-900">
            Insights {data.metadata.lookbackDays} วันล่าสุด ({data.metadata.timeZone})
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableDimensions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleDimensionChange(option.id)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                dimension === option.id
                  ? "bg-blue-600 text-white"
                  : "border border-blue-200 bg-white text-blue-600 hover:bg-blue-50"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <ControlToggle
          label="มุมมองเวลา"
          options={[
            { id: "daily", label: "รายวัน" },
            { id: "weekly", label: "รายสัปดาห์" },
          ]}
          value={granularity}
          onChange={(value) => handleGranularityChange(value as Granularity)}
        />
        <ControlToggle
          label="โฟกัส"
          options={[
            { id: "sales", label: "ยอดขาย" },
            { id: "attendance", label: "การเช็กอิน" },
          ]}
          value={focus}
          onChange={(value) => handleFocusChange(value as Focus)}
        />
        <div className="flex flex-wrap gap-2">
          {availablePresetConfigs.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetSelect(preset)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                activePresetId === preset.id
                  ? "bg-blue-600 text-white"
                  : "border border-blue-200 bg-white text-blue-600 hover:bg-blue-50"
              }`}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setActivePresetId("custom")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              activePresetId === "custom"
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            ปรับเอง
          </button>
        </div>
      </div>

      <div className="space-y-3 rounded-3xl border border-blue-100 bg-white p-5 shadow-inner shadow-blue-100/60">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <Legend color="bg-blue-500" label="ยอดขาย (บาท)" active={focus === "sales"} />
            <Legend
              color="bg-indigo-500"
              label="เช็กอิน (ครั้ง)"
              active={focus === "attendance"}
            />
          </div>
          <span>อัปเดต {new Date(data.metadata.generatedAt).toLocaleString("th-TH")}</span>
        </div>

        {timelinePoints.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-blue-200 px-4 py-6 text-center text-sm text-blue-500">
            ยังไม่มีข้อมูลเพียงพอสำหรับสร้างกราฟ
          </p>
        ) : (
          <div className="flex h-60 items-end gap-3">
            {timelinePoints.map((point) => {
              const salesHeight =
                maxSales > 0 ? Math.max(6, Math.round((point.salesTotal / maxSales) * 100)) : 0;
              const checkInHeight =
                maxCheckIns > 0
                  ? Math.max(6, Math.round((point.checkIns / maxCheckIns) * 100))
                  : 0;
              return (
                <div key={point.key} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-full w-full items-end gap-1">
                    <div
                      className={`relative flex-1 rounded-xl bg-gradient-to-t from-blue-200 via-sky-400 to-blue-600 shadow-[0_18px_40px_-32px_rgba(37,99,235,0.7)] transition-all duration-500 ${
                        focus === "sales" ? "" : "opacity-75"
                      }`}
                      style={{ height: `${salesHeight}%` }}
                    >
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-full bg-white/95 px-2 py-1 text-[11px] font-semibold text-blue-600 shadow">
                        {currencyDetailedFormatter.format(point.salesTotal)}
                      </span>
                    </div>
                    <div
                      className={`relative flex-1 rounded-xl bg-gradient-to-t from-indigo-200 via-indigo-400 to-indigo-600 shadow-[0_18px_40px_-32px_rgba(79,70,229,0.65)] transition-all duration-500 ${
                        focus === "attendance" ? "" : "opacity-75"
                      }`}
                      style={{ height: `${checkInHeight}%` }}
                    >
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 rounded-full bg-white/95 px-2 py-1 text-[11px] font-semibold text-indigo-600 shadow">
                        {numberFormatter.format(point.checkIns)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-slate-600">{point.label}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-800">
            Segmentation —{" "}
            {dimension === "store" ? "อันดับสาขา" : "พนักงาน"} (โฟกัส{" "}
            {focus === "sales" ? "ยอดขาย" : "การเช็กอิน"})
          </p>
          {activePresetId !== "custom" && (
            <p className="text-xs text-slate-500">
              {
                availablePresetConfigs.find((preset) => preset.id === activePresetId)
                  ?.description
              }
            </p>
          )}
        </div>
        {allSegments.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-blue-200 px-4 py-3 text-xs text-blue-500">
            ยังไม่มีข้อมูลเพียงพอสำหรับการจัดอันดับในมุมมองนี้
          </p>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {allSegments.map((segment) => (
              <li
                key={segment.id}
                className="flex flex-col gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-600 shadow-[0_12px_40px_-30px_rgba(37,99,235,0.45)]"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800">{segment.label}</p>
                  <span className="text-xs text-slate-400">
                    {dimension === "store"
                      ? `${numberFormatter.format(
                          "activeEmployees" in segment ? segment.activeEmployees : 0,
                        )} คนในทีม`
                      : `${"stores" in segment ? segment.stores.length : 0} สาขา`}
                  </span>
                </div>
                {dimension === "store" ? (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-slate-400">ยอดขายรวม</p>
                      <p className="font-semibold text-blue-600">
                        {"salesTotal" in segment
                          ? currencyFormatter.format(segment.salesTotal)
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">เช็กอิน</p>
                      <p className="font-semibold text-indigo-600">
                        {numberFormatter.format(segment.checkIns)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">รายการขาย</p>
                      <p className="font-semibold text-slate-700">
                        {"salesCount" in segment
                          ? `${numberFormatter.format(segment.salesCount)} รายการ`
                          : "-"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-slate-400">เช็กอิน</p>
                      <p className="font-semibold text-indigo-600">
                        {numberFormatter.format(segment.checkIns)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">เช็กเอาต์</p>
                      <p className="font-semibold text-slate-700">
                        {numberFormatter.format(segment.checkOuts)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">สาขาที่ไป</p>
                      <p className="font-semibold text-blue-600">
                        {"stores" in segment ? segment.stores.length : 0} แห่ง
                      </p>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ControlToggle({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ id: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <div className="flex overflow-hidden rounded-full border border-blue-200 bg-white text-xs font-semibold text-blue-600 shadow-sm">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`px-3 py-1 transition ${
              value === option.id ? "bg-blue-600 text-white" : "hover:bg-blue-50"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Legend({
  color,
  label,
  active,
}: {
  color: string;
  label: string;
  active: boolean;
}) {
  return (
    <span className={`flex items-center gap-1 text-xs ${active ? "text-slate-600" : "text-slate-400"}`}>
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
