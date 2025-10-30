"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Map as LeafletMap,
  Circle as LeafletCircle,
  Polyline as LeafletPolyline,
  Marker as LeafletMarker,
} from "leaflet";
import { haversineDistance, bearingBetween, bearingToCompass } from "@/lib/geo";

type GeofenceGuideProps = {
  store: {
    name: string;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    radius?: number | null;
  };
  isOpen: boolean;
  onClose: () => void;
};

type UserPosition = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  timestamp: number;
};

const DEFAULT_RADIUS = 100;

export default function GeofenceGuide({ store, isOpen, onClose }: GeofenceGuideProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const storeMarkerRef = useRef<LeafletMarker | null>(null);
  const storeCircleRef = useRef<LeafletCircle | null>(null);
  const userMarkerRef = useRef<LeafletMarker | null>(null);
  const userAccuracyCircleRef = useRef<LeafletCircle | null>(null);
  const connectorRef = useRef<LeafletPolyline | null>(null);
  const mapInitializedRef = useRef(false);
  const watcherRef = useRef<number | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const boundsFittedRef = useRef(false);
  const [isLoadingMap, setIsLoadingMap] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const storeCoords = useMemo(() => {
    if (
      typeof store.latitude === "number" &&
      Number.isFinite(store.latitude) &&
      typeof store.longitude === "number" &&
      Number.isFinite(store.longitude)
    ) {
      return {
        latitude: store.latitude,
        longitude: store.longitude,
      };
    }
    return null;
  }, [store.latitude, store.longitude]);

  useEffect(() => {
    if (!isOpen) return;
    if (!storeCoords) {
      setMapError("ร้านนี้ยังไม่ได้ตั้งค่าพิกัดบนแผนที่");
      return;
    }
    let isCancelled = false;
    const setupMap = async () => {
      setIsLoadingMap(true);
      setMapError(null);
      try {
        const [{ default: L }] = await Promise.all([
          import("leaflet"),
          import("leaflet/dist/leaflet.css"),
        ]);
        leafletRef.current = L;

        if (!mapContainerRef.current || isCancelled) return;
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }

        const map = L.map(mapContainerRef.current, {
          center: [storeCoords.latitude, storeCoords.longitude],
          zoom: 17,
          zoomControl: false,
        });
        mapRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        storeMarkerRef.current = L.marker([storeCoords.latitude, storeCoords.longitude], {
          icon: new L.Icon.Default(),
        }).addTo(map);

        storeCircleRef.current = L.circle([storeCoords.latitude, storeCoords.longitude], {
          radius: store.radius ?? DEFAULT_RADIUS,
          color: "#16a34a",
          fillColor: "#22c55e",
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(map);

        mapInitializedRef.current = true;
        boundsFittedRef.current = false;
      } catch (error) {
        console.error("[GeofenceGuide] failed to initialise map", error);
        setMapError("ไม่สามารถโหลดแผนที่ได้ กรุณาลองใหม่");
      } finally {
        if (!isCancelled) {
          setIsLoadingMap(false);
        }
      }
    };

    void setupMap();

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      leafletRef.current = null;
      storeMarkerRef.current = null;
      storeCircleRef.current = null;
      userMarkerRef.current = null;
      userAccuracyCircleRef.current = null;
      connectorRef.current = null;
      mapInitializedRef.current = false;
      boundsFittedRef.current = false;
    };
  }, [isOpen, storeCoords, store.radius]);

  useEffect(() => {
    if (!isOpen) return;
    if (!navigator.geolocation) {
      setLocationError("อุปกรณ์ของคุณไม่รองรับการแชร์พิกัด");
      return;
    }
    setLocationError(null);
    setIsLocating(true);
    watcherRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setIsLocating(false);
        setLocationError(null);
        setUserPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy ?? null,
          timestamp: position.timestamp,
        });
      },
      (error) => {
        setIsLocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError("กรุณาอนุญาตการเข้าถึงตำแหน่งเพื่อดูแผนที่");
            break;
          case error.TIMEOUT:
            setLocationError("การดึงตำแหน่งใช้เวลานานเกินไป กรุณาลองใหม่");
            break;
          default:
            setLocationError("ไม่สามารถดึงตำแหน่งได้ กรุณาลองใหม่");
            break;
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );

    return () => {
      if (watcherRef.current !== null) {
        navigator.geolocation.clearWatch(watcherRef.current);
        watcherRef.current = null;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!mapInitializedRef.current || !storeCoords || !mapRef.current || !leafletRef.current) {
      return;
    }
    const map = mapRef.current;
    const L = leafletRef.current;

    if (userPosition) {
      const { latitude, longitude, accuracy } = userPosition;
      const latLng: [number, number] = [latitude, longitude];
      const storeLatLng: [number, number] = [storeCoords.latitude, storeCoords.longitude];
      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker(latLng, {
          icon: L.divIcon({
            className:
              "w-4 h-4 rounded-full bg-blue-500 ring-2 ring-white ring-offset-2 ring-offset-blue-500 shadow-lg",
          }),
        }).addTo(map);
      } else {
        userMarkerRef.current.setLatLng(latLng);
      }

      if (!userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current = L.circle(latLng, {
          radius: Number.isFinite(accuracy ?? 0) ? accuracy ?? 0 : 0,
          color: "#3b82f6",
          fillColor: "#60a5fa",
          fillOpacity: 0.1,
          weight: 1,
        }).addTo(map);
      } else {
        userAccuracyCircleRef.current.setLatLng(latLng);
        userAccuracyCircleRef.current.setRadius(Number.isFinite(accuracy ?? 0) ? accuracy ?? 0 : 0);
      }

      if (!connectorRef.current) {
        connectorRef.current = L.polyline([latLng, storeLatLng], {
          color: "#1d4ed8",
          weight: 3,
          dashArray: "6 6",
          opacity: 0.8,
        }).addTo(map);
      } else {
        connectorRef.current.setLatLngs([latLng, storeLatLng]);
      }

      if (!boundsFittedRef.current) {
        const bounds = L.latLngBounds([latLng, storeLatLng]).pad(0.25);
        map.fitBounds(bounds);
        boundsFittedRef.current = true;
      }
    } else if (storeCoords && map) {
      map.setView([storeCoords.latitude, storeCoords.longitude], 17);
    }
  }, [storeCoords, userPosition]);

  const distanceInfo = useMemo(() => {
    if (!storeCoords || !userPosition) {
      return null;
    }
    const distance = Math.round(
      haversineDistance(
        { latitude: userPosition.latitude, longitude: userPosition.longitude },
        storeCoords,
      ),
    );
    const bearing = bearingBetween(
      { latitude: userPosition.latitude, longitude: userPosition.longitude },
      storeCoords,
    );
    const direction = bearingToCompass(bearing);
    return {
      distance,
      direction,
      bearing,
    };
  }, [storeCoords, userPosition]);

  const googleMapsLink = useMemo(() => {
    if (!storeCoords) return null;
    if (userPosition) {
      return `https://www.google.com/maps/dir/?api=1&origin=${userPosition.latitude},${userPosition.longitude}&destination=${storeCoords.latitude},${storeCoords.longitude}&travelmode=walking`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${storeCoords.latitude},${storeCoords.longitude}`;
  }, [storeCoords, userPosition]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm">
      <button
        type="button"
        aria-label="ปิดแผนที่"
        className="flex-1"
        onClick={handleClose}
      />
      <div className="relative max-h-[85vh] w-full rounded-t-[32px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-500">
              Geofence Guide
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{store.name}</h2>
            {store.address && (
              <p className="text-xs text-slate-500">{store.address}</p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            ปิด
          </button>
        </div>

        <div className="space-y-4 px-6 py-4">
          {!storeCoords ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-600">
              ร้านนี้ยังไม่มีการตั้งค่าพิกัดบนแผนที่ กรุณาติดต่อผู้ดูแลระบบ
            </div>
          ) : (
            <>
              <div
                ref={mapContainerRef}
                className="h-[320px] w-full overflow-hidden rounded-3xl border border-slate-200 shadow-inner"
              >
                {isLoadingMap && (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">
                    กำลังโหลดแผนที่...
                  </div>
                )}
                {mapError && (
                  <div className="flex h-full items-center justify-center px-4 text-center text-sm text-red-500">
                    {mapError}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                <div>
                  <p className="font-semibold text-slate-800">สถานะพิกัด</p>
                  {locationError ? (
                    <p className="mt-1 text-red-500">{locationError}</p>
                  ) : userPosition ? (
                    <p className="mt-1">
                      รับสัญญาณ {new Date(userPosition.timestamp).toLocaleTimeString("th-TH")}
                    </p>
                  ) : (
                    <p className="mt-1 text-slate-500">
                      {isLocating ? "กำลังค้นหาตำแหน่ง..." : "ยังไม่ได้รับพิกัด"}
                    </p>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">ความแม่นยำ</p>
                  {userPosition?.accuracy ? (
                    <p className="mt-1">±{Math.round(userPosition.accuracy)} เมตร</p>
                  ) : (
                    <p className="mt-1 text-slate-500">—</p>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">ระยะห่าง</p>
                  {distanceInfo ? (
                    <p className="mt-1">
                      {distanceInfo.distance} เมตร
                    </p>
                  ) : (
                    <p className="mt-1 text-slate-500">—</p>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">ทิศทาง</p>
                  {distanceInfo ? (
                    <p className="mt-1">
                      {distanceInfo.direction} ({Math.round(distanceInfo.bearing)}°)
                    </p>
                  ) : (
                    <p className="mt-1 text-slate-500">—</p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <a
                  href={
                    googleMapsLink ??
                    `https://www.google.com/maps/search/?api=1&query=${storeCoords.latitude},${storeCoords.longitude}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700"
                >
                  เปิดใน Google Maps
                </a>
                <button
                  type="button"
                  onClick={() => {
                    if (userPosition && mapRef.current) {
                      mapRef.current.setView([userPosition.latitude, userPosition.longitude], 18);
                    }
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  disabled={!userPosition}
                >
                  จัดมุมมองไปยังตำแหน่งฉัน
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
