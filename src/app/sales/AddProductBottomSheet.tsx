"use client";

import { useEffect, useState } from "react";
import { X, Plus, Minus, ShoppingCart, Trash2, Check } from "lucide-react";

type ProductUnitOption = {
  assignmentUnitId: string;
  unitId: string;
  unitName: string;
  pricePc: number;
  multiplierToBase: number;
};

type ProductOption = {
  assignmentId: string;
  productId: string;
  productCode: string;
  productName: string;
  units: ProductUnitOption[];
};

type StockInventoryItem = {
  productId: string;
  unitId: string;
  balance: number;
  updatedAt: string;
};

type CartItem = {
  assignmentId: string;
  unitQuantities: Record<string, string>;
  product: ProductOption;
};

type AddProductBottomSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  products: ProductOption[];
  stockInventory: StockInventoryItem[];
  onAdd: (assignmentId: string, unitQuantities: Record<string, string>) => void;
};

export default function AddProductBottomSheet({
  isOpen,
  onClose,
  products,
  stockInventory,
  onAdd,
}: AddProductBottomSheetProps) {
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");
  const [unitQuantities, setUnitQuantities] = useState<Record<string, string>>({});
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const selectedProduct = products.find((p) => p.assignmentId === selectedAssignmentId);

  // Reset form when closed
  useEffect(() => {
    if (!isOpen) {
      setSelectedAssignmentId("");
      setUnitQuantities({});
      setCartItems([]);
      setShowCart(false);
    }
  }, [isOpen]);

  const handleQuantityChange = (assignmentUnitId: string, value: string) => {
    setUnitQuantities((prev) => ({
      ...prev,
      [assignmentUnitId]: value,
    }));
  };

  const incrementQuantity = (assignmentUnitId: string) => {
    const current = parseInt(unitQuantities[assignmentUnitId] || "0", 10);
    setUnitQuantities((prev) => ({
      ...prev,
      [assignmentUnitId]: String(current + 1),
    }));
  };

  const decrementQuantity = (assignmentUnitId: string) => {
    const current = parseInt(unitQuantities[assignmentUnitId] || "0", 10);
    if (current > 0) {
      setUnitQuantities((prev) => ({
        ...prev,
        [assignmentUnitId]: String(current - 1),
      }));
    }
  };

  const calculateSubtotal = () => {
    if (!selectedProduct) return 0;
    let total = 0;
    selectedProduct.units.forEach((unit) => {
      const qty = parseInt(unitQuantities[unit.assignmentUnitId] || "0", 10);
      total += qty * unit.pricePc;
    });
    return total;
  };

  const hasQuantity = () => {
    return Object.values(unitQuantities).some((qty) => parseInt(qty || "0", 10) > 0);
  };

  const handleAddToCart = () => {
    if (!selectedAssignmentId || !hasQuantity() || !selectedProduct) return;

    // Add to cart
    setCartItems((prev) => [
      ...prev,
      {
        assignmentId: selectedAssignmentId,
        unitQuantities: { ...unitQuantities },
        product: selectedProduct,
      },
    ]);

    // Reset form for next product
    setSelectedAssignmentId("");
    setUnitQuantities({});
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitAll = () => {
    if (cartItems.length === 0) return;

    // Add all cart items to main page
    cartItems.forEach((item) => {
      onAdd(item.assignmentId, item.unitQuantities);
    });

    onClose();
  };

  const getStockBalance = (productId: string, unitId: string): number | null => {
    const stock = stockInventory.find(
      (s) => s.productId === productId && s.unitId === unitId
    );
    return stock ? stock.balance : null;
  };

  const checkExceedsStock = (productId: string, unitId: string, quantity: number): boolean => {
    const balance = getStockBalance(productId, unitId);
    return balance !== null && quantity > balance;
  };

  if (!isOpen) return null;

  const subtotal = calculateSubtotal();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Bottom Sheet (Mobile) / Modal (Desktop) */}
      <div className="fixed inset-x-0 bottom-0 z-[200] max-h-[85vh] overflow-hidden rounded-t-[32px] border-t border-white/70 bg-white shadow-[0_-20px_80px_-30px_rgba(37,99,235,0.6)] md:inset-x-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-3xl md:max-h-[85vh] md:overflow-y-auto md:rounded-[32px] md:border md:border-white/70 md:shadow-[0_20px_80px_-30px_rgba(37,99,235,0.6)]">
        {/* Handle Bar (Mobile Only) */}
        <div className="flex justify-center py-3 md:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">เพิ่มสินค้า</h2>
            <p className="text-xs text-slate-500">เลือกสินค้าและกรอกจำนวน</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Cart Badge */}
            {cartItems.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCart(!showCart)}
                className="relative flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition hover:bg-blue-200"
              >
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-sky-500 text-[10px] font-bold text-white shadow-lg">
                  {cartItems.length}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="max-h-[calc(85vh-240px)] overflow-y-auto px-6 py-4 md:max-h-none md:overflow-y-visible">
          {/* Cart Review Section */}
          {showCart && cartItems.length > 0 && (
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">รถเข็นสินค้า ({cartItems.length})</h3>
                <button
                  type="button"
                  onClick={() => setShowCart(false)}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  ซ่อน
                </button>
              </div>
              {cartItems.map((item, index) => {
                const itemTotal = item.product.units.reduce((sum, unit) => {
                  const qty = parseInt(item.unitQuantities[unit.assignmentUnitId] || "0", 10);
                  return sum + qty * unit.pricePc;
                }, 0);

                const itemSummary = item.product.units
                  .map((unit) => {
                    const qty = parseInt(item.unitQuantities[unit.assignmentUnitId] || "0", 10);
                    return qty > 0 ? `${qty} ${unit.unitName}` : null;
                  })
                  .filter(Boolean)
                  .join(", ");

                return (
                  <div
                    key={index}
                    className="flex items-start justify-between gap-3 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/50 to-white p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {item.product.productCode}
                      </p>
                      <p className="text-xs text-slate-600 truncate">{item.product.productName}</p>
                      <p className="mt-1 text-xs text-slate-500">{itemSummary}</p>
                      <p className="mt-1 text-sm font-bold text-blue-600">
                        {itemTotal.toLocaleString("th-TH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        บาท
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(index)}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 transition hover:bg-red-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
              <div className="border-t border-slate-200 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">รวมทั้งหมด</span>
                  <span className="text-lg font-bold text-blue-600">
                    {cartItems
                      .reduce((total, item) => {
                        return (
                          total +
                          item.product.units.reduce((sum, unit) => {
                            const qty = parseInt(item.unitQuantities[unit.assignmentUnitId] || "0", 10);
                            return sum + qty * unit.pricePc;
                          }, 0)
                        );
                      }, 0)
                      .toLocaleString("th-TH", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                    บาท
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Product Selection */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              สินค้า
            </label>
            <select
              value={selectedAssignmentId}
              onChange={(e) => {
                setSelectedAssignmentId(e.target.value);
                setUnitQuantities({});
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="">เลือกสินค้า...</option>
              {products.map((product) => (
                <option key={product.assignmentId} value={product.assignmentId}>
                  {product.productCode} · {product.productName}
                </option>
              ))}
            </select>
          </div>

          {/* Units */}
          {selectedProduct && selectedProduct.units.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-slate-700">
                กรอกจำนวนตามหน่วย
              </p>
              {selectedProduct.units.map((unit) => {
                const quantity = parseInt(unitQuantities[unit.assignmentUnitId] || "0", 10);
                const stockBalance = getStockBalance(selectedProduct.productId, unit.unitId);
                const exceedsStock = checkExceedsStock(selectedProduct.productId, unit.unitId, quantity);
                const unitSubtotal = quantity * unit.pricePc;

                return (
                  <div
                    key={unit.assignmentUnitId}
                    className={`rounded-2xl border p-4 ${
                      exceedsStock
                        ? "border-rose-400 bg-gradient-to-br from-rose-50 to-red-50"
                        : stockBalance === 0
                        ? "border-rose-300 bg-gradient-to-br from-rose-50 to-red-50"
                        : stockBalance !== null && stockBalance <= 10
                        ? "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50"
                        : stockBalance !== null
                        ? "border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="mb-3 flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{unit.unitName}</p>
                        <p className="text-xs text-slate-600">
                          {unit.pricePc.toLocaleString("th-TH", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          บาท/{unit.unitName}
                        </p>
                        {stockBalance !== null && (
                          <p
                            className={`mt-1 text-xs font-semibold ${
                              exceedsStock
                                ? "text-rose-700"
                                : stockBalance === 0
                                ? "text-rose-700"
                                : stockBalance <= 10
                                ? "text-amber-700"
                                : "text-emerald-700"
                            }`}
                          >
                            {stockBalance === 0
                              ? "🔴 สต็อกหมด (0)"
                              : exceedsStock
                              ? `🚫 เกินสต็อก (คงเหลือ ${stockBalance.toLocaleString("th-TH")})`
                              : stockBalance <= 10
                              ? `🟡 สต็อกต่ำ (คงเหลือ ${stockBalance.toLocaleString("th-TH")})`
                              : `🟢 คงเหลือ ${stockBalance.toLocaleString("th-TH")}`}
                          </p>
                        )}
                      </div>
                      {unitSubtotal > 0 && (
                        <div className="text-right">
                          <p className="text-sm font-bold text-blue-600">
                            {unitSubtotal.toLocaleString("th-TH", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </p>
                          <p className="text-xs text-slate-500">บาท</p>
                        </div>
                      )}
                    </div>

                    {/* Quantity Input */}
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => decrementQuantity(unit.assignmentUnitId)}
                        className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-blue-200 bg-white text-blue-600 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={quantity === 0}
                      >
                        <Minus className="h-5 w-5" />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={unitQuantities[unit.assignmentUnitId] || ""}
                        onChange={(e) => handleQuantityChange(unit.assignmentUnitId, e.target.value)}
                        placeholder="0"
                        className="h-12 flex-1 rounded-xl border-2 border-slate-200 bg-white px-4 text-center text-lg font-semibold text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() => incrementQuantity(unit.assignmentUnitId)}
                        className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-blue-600 bg-blue-600 text-white transition active:scale-95"
                      >
                        <Plus className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!selectedProduct && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <p className="text-sm text-slate-500">
                👆 เลือกสินค้าด้านบนเพื่อเริ่มกรอกจำนวน
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 px-6 py-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">ยอดรวมสินค้าปัจจุบัน</span>
            <span className="text-2xl font-bold text-blue-600">
              {subtotal.toLocaleString("th-TH", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              <span className="text-base">บาท</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border-2 border-slate-200 bg-white px-6 py-3 font-semibold text-slate-600 transition active:scale-95"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!selectedAssignmentId || !hasQuantity()}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 font-semibold text-white shadow-lg transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingCart className="h-5 w-5" />
              ใส่รถเข็น
            </button>
          </div>
          {cartItems.length > 0 && (
            <button
              type="button"
              onClick={handleSubmitAll}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500 px-6 py-3 font-semibold text-white shadow-lg transition active:scale-95"
            >
              <Check className="h-5 w-5" />
              บันทึกทั้งหมด ({cartItems.length} รายการ)
            </button>
          )}
        </div>
      </div>
    </>
  );
}
