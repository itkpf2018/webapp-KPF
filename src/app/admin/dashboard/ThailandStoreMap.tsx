"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { MapPin, TrendingUp, ShoppingBag } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface StoreMarker {
  id: string;
  name: string;
  province: string;
  lat: number;
  lng: number;
  sales: number;
  transactions: number;
}

interface ThailandStoreMapProps {
  stores: StoreMarker[];
}

const currencyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("th-TH");

export default function ThailandStoreMap({ stores }: ThailandStoreMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <MapSkeleton />;
  }

  // Thailand center coordinates (Bangkok)
  const thailandCenter: [number, number] = [13.7563, 100.5018];

  // Calculate max sales for sizing markers
  const maxSales = Math.max(...stores.map((s) => s.sales), 1);

  // Get marker size based on sales volume
  const getMarkerSize = (sales: number) => {
    const minSize = 8;
    const maxSize = 25;
    if (maxSales === 0) return minSize;
    return minSize + ((sales / maxSales) * (maxSize - minSize));
  };

  // Get marker color based on sales volume
  const getMarkerColor = (sales: number) => {
    if (sales > 500000) return "#0ea5e9"; // sky-500 - high sales
    if (sales > 200000) return "#38bdf8"; // sky-400 - medium sales
    return "#7dd3fc"; // sky-300 - low sales
  };

  // Calculate total sales
  const totalSales = stores.reduce((sum, store) => sum + store.sales, 0);
  const avgSalesPerStore = stores.length > 0 ? totalSales / stores.length : 0;
  const topStore = stores.reduce((max, store) => (store.sales > max.sales ? store : max), stores[0] || { sales: 0 });

  return (
    <div className="rounded-3xl border-2 border-blue-100 bg-white p-6 shadow-xl">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Store Performance Map</h3>
          <p className="text-sm text-slate-500">ยอดขายตามสถานที่ทั่วประเทศไทย</p>
        </div>
        <div className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600">
          {stores.length} ร้าน
        </div>
      </div>

      {/* Map Container */}
      <div className="relative h-[500px] overflow-hidden rounded-2xl border-2 border-blue-100">
        <MapContainer
          center={thailandCenter}
          zoom={6}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
          zoomControl={true}
        >
          {/* OpenStreetMap Tiles - FREE */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Store Markers */}
          {stores.map((store) => {
            const markerSize = getMarkerSize(store.sales);
            const markerColor = getMarkerColor(store.sales);

            return (
              <CircleMarker
                key={store.id}
                center={[store.lat, store.lng]}
                radius={markerSize}
                pathOptions={{
                  fillColor: markerColor,
                  fillOpacity: 0.8,
                  color: "#0284c7",
                  weight: 2,
                }}
              >
                <Popup>
                  <div className="p-3 min-w-[220px]">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="rounded-lg bg-gradient-to-br from-blue-500 to-sky-400 p-2">
                        <MapPin className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-base">{store.name}</h4>
                        <p className="text-xs text-slate-500">{store.province}</p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          ยอดขาย:
                        </span>
                        <span className="text-sm font-bold text-blue-600">
                          {currencyFormatter.format(store.sales)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          <ShoppingBag className="h-3 w-3" />
                          ธุรกรรม:
                        </span>
                        <span className="text-sm font-semibold text-slate-900">
                          {numberFormatter.format(store.transactions)} รายการ
                        </span>
                      </div>

                      {store.transactions > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-600">Avg/ธุรกรรม:</span>
                          <span className="text-sm font-semibold text-slate-900">
                            {currencyFormatter.format(Math.round(store.sales / store.transactions))}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="mt-3 w-full rounded-lg bg-blue-500 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600 transition"
                    >
                      ดูรายละเอียด →
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-6 rounded-2xl border border-blue-100 bg-blue-50/30 p-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-sky-300 border-2 border-blue-600" />
          <span className="text-xs font-medium text-slate-700">&lt; ฿200K</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-sky-400 border-2 border-blue-600" />
          <span className="text-xs font-medium text-slate-700">฿200K - ฿500K</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-sky-500 border-2 border-blue-600" />
          <span className="text-xs font-medium text-slate-700">&gt; ฿500K</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-sky-50 p-3 text-center">
          <p className="text-xs text-slate-600 mb-1">ยอดขายรวม</p>
          <p className="text-lg font-bold text-blue-600">
            {currencyFormatter.format(totalSales)}
          </p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-sky-50 p-3 text-center">
          <p className="text-xs text-slate-600 mb-1">เฉลี่ยต่อร้าน</p>
          <p className="text-lg font-bold text-blue-600">
            {currencyFormatter.format(Math.round(avgSalesPerStore))}
          </p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-sky-50 p-3 text-center">
          <p className="text-xs text-slate-600 mb-1">ร้านสูงสุด</p>
          <p className="text-lg font-bold text-blue-600">
            {currencyFormatter.format(topStore?.sales || 0)}
          </p>
        </div>
      </div>
    </div>
  );
}

function MapSkeleton() {
  return (
    <div className="rounded-3xl border-2 border-blue-100 bg-white p-6 shadow-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-6 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-8 w-32 animate-pulse rounded-full bg-slate-200" />
      </div>
      <div className="h-[500px] animate-pulse rounded-2xl bg-slate-200" />
      <div className="mt-4 flex justify-center gap-6">
        <div className="h-6 w-24 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-6 w-24 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-6 w-24 animate-pulse rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}
