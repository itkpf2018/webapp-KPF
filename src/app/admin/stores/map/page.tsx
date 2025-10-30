"use client";

import { useEffect, useRef, useState } from "react";
import type { StoreRecord } from "@/lib/configStore";
import type { Layer, Map as LeafletMap } from "leaflet";
import Link from "next/link";

type LeafletModule = typeof import("leaflet");

type StoreWithLocation = StoreRecord & {
  latitude: number;
  longitude: number;
};

export default function StoresMapPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedStore, setSelectedStore] = useState<StoreRecord | null>(null);

  // Fetch stores
  useEffect(() => {
    const fetchStores = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/stores");
        if (!response.ok) {
          throw new Error("ไม่สามารถโหลดรายชื่อร้าน/หน่วยงานได้");
        }
        const data = (await response.json()) as { stores?: StoreRecord[] };
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

    void fetchStores();
  }, []);

  // Initialize map
  useEffect(() => {
    let leafletModule: LeafletModule | null = null;
    let map: LeafletMap | null = null;

    const initMap = async () => {
      if (!mapContainerRef.current || mapRef.current) return;

      try {
        // Dynamically import Leaflet
        const imported = await import("leaflet");
        leafletModule = (imported.default ?? imported) as LeafletModule;

        // Import Leaflet CSS once on the client
        await import("leaflet/dist/leaflet.css");

        // Fix default marker icons
        const iconProto = leafletModule.Icon.Default.prototype as unknown as {
          _getIconUrl?: () => void;
        };
        if (iconProto._getIconUrl) {
          delete iconProto._getIconUrl;
        }
        leafletModule.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
          iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
          shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        });

        // Initialize map centered on Thailand
        map = leafletModule.map(mapContainerRef.current, {
          center: [13.7563, 100.5018], // Bangkok
          zoom: 6,
          zoomControl: true,
        });

        // Add OpenStreetMap tiles
        leafletModule.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;
        leafletRef.current = leafletModule;
        setIsMapReady(true);
      } catch (error) {
        console.error("Failed to initialize map:", error);
        setError("ไม่สามารถโหลดแผนที่ได้");
      }
    };

    void initMap();

    // Cleanup
    return () => {
      if (map) {
        map.remove();
        mapRef.current = null;
      }
      leafletRef.current = null;
    };
  }, []);

  // Add markers when map is ready and stores are loaded
  useEffect(() => {
    if (!isMapReady || !mapRef.current || stores.length === 0) return;

    const leaflet = leafletRef.current;
    if (!leaflet) return;
    const map = mapRef.current;

    // Clear existing markers
    map.eachLayer((layer: Layer) => {
      if (layer instanceof leaflet.Marker || layer instanceof leaflet.Circle) {
        map.removeLayer(layer);
      }
    });

    const storesWithLocation = stores.filter(
      (store): store is StoreWithLocation =>
        store.latitude !== null &&
        store.longitude !== null &&
        Number.isFinite(store.latitude) &&
        Number.isFinite(store.longitude),
    );

    if (storesWithLocation.length === 0) {
      return;
    }

    // Province colors mapping
    const provinceColors: Record<string, string> = {
      กรุงเทพมหานคร: "#3b82f6", // blue
      เชียงใหม่: "#10b981", // green
      ภูเก็ต: "#f59e0b", // orange
      ขอนแก่น: "#8b5cf6", // purple
      สงขลา: "#ec4899", // pink
    };

    const getMarkerColor = (province: string | null | undefined): string => {
      if (!province) return "#6b7280"; // gray for unknown
      return provinceColors[province] || "#6b7280";
    };

    // Create custom marker icon function
    const createColoredIcon = (color: string) => {
      return leaflet.divIcon({
        className: "custom-marker",
        html: `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50% 50% 50% 0; border: 3px solid white; transform: rotate(-45deg); box-shadow: 0 2px 10px rgba(0,0,0,0.3);"><div style="transform: rotate(45deg); width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;"></div></div>`,
        iconSize: [25, 25],
        iconAnchor: [12, 25],
        popupAnchor: [0, -25],
      });
    };

    const bounds = leaflet.latLngBounds([]);

    // Add markers for each store
    storesWithLocation.forEach((store) => {
      const markerColor = getMarkerColor(store.province);
      const marker = leaflet.marker([store.latitude, store.longitude], {
        icon: createColoredIcon(markerColor),
      }).addTo(map);

      // Add circle for geofence radius
      const radius = store.radius ?? 100;
      leaflet.circle([store.latitude, store.longitude], {
        radius,
        color: markerColor,
        fillColor: markerColor,
        fillOpacity: 0.1,
        weight: 2,
      }).addTo(map);

      // Create popup content
      const popupContent = `
        <div style="min-width: 200px;">
          <h3 style="font-size: 14px; font-weight: 600; margin: 0 0 8px 0; color: #1e293b;">${store.name}</h3>
          ${
            store.province
              ? `<p style="font-size: 12px; margin: 4px 0; color: #64748b;"><strong>จังหวัด:</strong> ${store.province}</p>`
              : ""
          }
          ${
            store.address
              ? `<p style="font-size: 12px; margin: 4px 0; color: #64748b;"><strong>ที่อยู่:</strong> ${store.address}</p>`
              : ""
          }
          <p style="font-size: 12px; margin: 4px 0; color: #64748b;">
            <strong>พิกัด:</strong> ${store.latitude.toFixed(6)}, ${store.longitude.toFixed(6)}
          </p>
          <p style="font-size: 12px; margin: 4px 0; color: #64748b;">
            <strong>รัศมีเช็กอิน:</strong> ${radius}m
          </p>
        </div>
      `;

      marker.bindPopup(popupContent);

      marker.on("click", () => {
        setSelectedStore(store);
      });

      bounds.extend([store.latitude, store.longitude]);
    });

    // Fit map to show all markers
    if (storesWithLocation.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [isMapReady, stores]);

  const storesWithLocation = stores.filter(
    (store): store is StoreWithLocation =>
      store.latitude !== null &&
      store.longitude !== null &&
      Number.isFinite(store.latitude) &&
      Number.isFinite(store.longitude),
  );

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">แผนที่ร้านค้าทั้งหมด</h1>
          <p className="mt-1 text-sm text-slate-500">
            แสดงตำแหน่งและรัศมีการเช็กอินของร้านค้าแต่ละแห่ง
          </p>
        </div>
        <Link
          href="/admin/stores"
          className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
        >
          กลับไปหน้าจัดการ
        </Link>
      </header>

      {error && (
        <div className="rounded-3xl border border-red-100 bg-red-50/90 px-5 py-3 text-sm text-red-600 shadow-inner">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex h-96 items-center justify-center rounded-3xl border border-blue-100 bg-white/85">
          <p className="text-sm text-slate-500">กำลังโหลดข้อมูล...</p>
        </div>
      ) : storesWithLocation.length === 0 ? (
        <div className="flex h-96 flex-col items-center justify-center rounded-3xl border border-blue-100 bg-white/85">
          <p className="text-sm text-slate-500">ยังไม่มีร้านค้าที่มีตำแหน่งบนแผนที่</p>
          <Link
            href="/admin/stores"
            className="mt-4 text-sm font-semibold text-blue-600 hover:underline"
          >
            เพิ่มตำแหน่งร้านค้า
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Map */}
          <div className="lg:col-span-2">
            <div className="rounded-3xl border border-blue-100 bg-white p-4 shadow-inner shadow-blue-100/50">
              <div
                ref={mapContainerRef}
                className="h-[600px] w-full rounded-2xl border border-slate-200 shadow-inner"
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-emerald-100 bg-white p-4 shadow-inner shadow-emerald-100/50">
              <h2 className="text-sm font-semibold text-slate-800">
                สถิติ ({storesWithLocation.length} ร้าน)
              </h2>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <div className="flex justify-between">
                  <span>ร้านทั้งหมด:</span>
                  <span className="font-semibold">{stores.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>มีตำแหน่ง:</span>
                  <span className="font-semibold">{storesWithLocation.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>ไม่มีตำแหน่ง:</span>
                  <span className="font-semibold">{stores.length - storesWithLocation.length}</span>
                </div>
              </div>
            </div>

            {selectedStore && (
              <div className="rounded-3xl border border-blue-100 bg-white p-4 shadow-inner shadow-blue-100/50">
                <h2 className="text-sm font-semibold text-slate-800">ข้อมูลร้านที่เลือก</h2>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <div>
                    <p className="font-semibold text-slate-800">{selectedStore.name}</p>
                  </div>
                  {selectedStore.province && (
                    <div>
                      <span className="text-xs text-slate-500">จังหวัด: </span>
                      <span>{selectedStore.province}</span>
                    </div>
                  )}
                  {selectedStore.address && (
                    <div>
                      <span className="text-xs text-slate-500">ที่อยู่: </span>
                      <span>{selectedStore.address}</span>
                    </div>
                  )}
                  {selectedStore.latitude && selectedStore.longitude && (
                    <div>
                      <span className="text-xs text-slate-500">พิกัด: </span>
                      <span>
                        {selectedStore.latitude.toFixed(6)}, {selectedStore.longitude.toFixed(6)}
                      </span>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-slate-500">รัศมีเช็กอิน: </span>
                    <span>{selectedStore.radius ?? 100}m</span>
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-inner shadow-slate-100/50">
              <h2 className="text-sm font-semibold text-slate-800">รายชื่อร้าน</h2>
              <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
                {storesWithLocation.map((store) => (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() => {
                      setSelectedStore(store);
                      if (mapRef.current && store.latitude && store.longitude) {
                        mapRef.current.setView([store.latitude, store.longitude], 15);
                      }
                    }}
                    className={`w-full rounded-xl border p-3 text-left text-sm transition hover:border-blue-300 hover:bg-blue-50 ${
                      selectedStore?.id === store.id
                        ? "border-blue-300 bg-blue-50"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <p className="font-semibold text-slate-800">{store.name}</p>
                    {store.province && (
                      <p className="mt-1 text-xs text-slate-500">{store.province}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
