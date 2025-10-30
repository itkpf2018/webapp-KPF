"use client";

import ProductsPage from "../../products/page";

export default function ProductsSection() {
  return (
    <div className="space-y-6">
      <p className="text-xs text-slate-500">
        ปรับรหัสสินค้าและราคามาตรฐานเพื่อให้ฟอร์มยอดขายเลือกได้ถูกต้องและอัปเดตอัตโนมัติ
      </p>
      <div className="rounded-2xl border border-slate-100 bg-white/90">
        <ProductsPage />
      </div>
    </div>
  );
}
