"use client";

import SiteNav from "@/components/SiteNav";
import { useState, useEffect, useMemo, useCallback, useRef, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { haversineDistance } from "@/lib/geo";
import { useGeoPermission } from "@/lib/useGeoPermission";
import { useAuth } from "@/contexts/AuthContext";
import {
  PackagePlus,
  PackageMinus,
  Package,
  PackageCheck,
  Settings,
  User,
  Building2,
  MapPin,
  Layers,
  TrendingUp,
  TrendingDown,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  ChevronRight,
  Info,
  Save,
  X,
  Trash2,
  ShoppingCart,
} from "lucide-react";

// Types
type Employee = {
  id: string;
  name: string;
  employee_code?: string | null;
  default_store_id?: string | null;
};

type Store = {
  id: string;
  name: string;
  province?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radius?: number | null;
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

type TabType = "receive" | "return" | "initial" | "balance";

type TransactionType = "receive" | "sale" | "return" | "initial" | "adjustment";

type RecentTransaction = {
  id: string;
  transactionType: TransactionType;
  productName: string;
  unitName: string;
  quantity: number;
  note?: string;
  createdAt: string;
};

const KNOWN_TRANSACTION_TYPES: TransactionType[] = [
  "receive",
  "sale",
  "return",
  "initial",
  "adjustment",
];

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type LocationState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "error"; message: string }
  | { status: "resolved"; coords: GeolocationCoordinates };

type CartItem = {
  productId: string;
  productCode: string;
  productName: string;
  unitId: string;
  unitName: string;
  quantity: number;
  note?: string;
};

const LAST_EMPLOYEE_STORAGE_KEY = "stock:last-employee-id";
const LAST_STORE_STORAGE_KEY = "stock:last-store-id";

export default function StockManagementClient() {
  const { user } = useAuth();
  const isReadOnly = user?.role === 'sales';
  const queryClient = useQueryClient();

  // Selection state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabType>("receive");

  // Location state
  const [locationState, setLocationState] = useState<LocationState>({ status: "idle" });
  const locationStateRef = useRef<LocationState>(locationState);
  const [allowStoreOverride, setAllowStoreOverride] = useState(false);
  const [allowAllEmployees, setAllowAllEmployees] = useState(false);
  const { status: permissionStatus, requestPermission } = useGeoPermission();

  // Form state for Receive tab
  const [receiveProductId, setReceiveProductId] = useState<string>("");
  const [receiveUnitQuantities, setReceiveUnitQuantities] = useState<Record<string, string>>({});
  const [receiveNote, setReceiveNote] = useState<string>("");

  // Form state for Return tab
  const [returnProductId, setReturnProductId] = useState<string>("");
  const [returnUnitQuantities, setReturnUnitQuantities] = useState<Record<string, string>>({});
  const [returnNote, setReturnNote] = useState<string>("");

  // Form state for Initial Stock tab
  const [initialProductId, setInitialProductId] = useState<string>("");
  const [initialUnitQuantities, setInitialUnitQuantities] = useState<Record<string, string>>({});
  const [initialNote, setInitialNote] = useState<string>("");

  // Submit state
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  // Modal and Cart state for Receive
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receiveCart, setReceiveCart] = useState<CartItem[]>([]);
  const [receiveGlobalNote, setReceiveGlobalNote] = useState<string>("");

  // Modal and Cart state for Return
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnCart, setReturnCart] = useState<CartItem[]>([]);
  const [returnGlobalNote, setReturnGlobalNote] = useState<string>("");

  // Modal and Cart state for Initial/Adjustment
  const [isInitialModalOpen, setIsInitialModalOpen] = useState(false);
  const [adjustmentCart, setAdjustmentCart] = useState<CartItem[]>([]);
  const [adjustmentGlobalNote, setAdjustmentGlobalNote] = useState<string>("");

  // Sync locationStateRef
  useEffect(() => {
    locationStateRef.current = locationState;
  }, [locationState]);

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

  // Fetch employee-store assignments
  const { data: assignmentsData } = useQuery({
    queryKey: ["stock-employee-assignments"],
    queryFn: async () => {
      const response = await fetch("/api/stock/employee-assignments");
      if (!response.ok) return [];
      const data = await response.json();
      return data.assignments as Array<{
        employeeId: string;
        storeId: string;
        isPrimary: boolean;
      }>;
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
  const { data: inventoryData, isLoading: isLoadingInventory } = useQuery({
    queryKey: ["stock-inventory", selectedEmployeeId, selectedStoreId],
    queryFn: async () => {
      if (!selectedEmployeeId || !selectedStoreId) return [];
      const params = new URLSearchParams({
        employeeId: selectedEmployeeId,
        storeId: selectedStoreId
      });
      const response = await fetch(`/api/stock/inventory?${params.toString()}`);
      if (!response.ok) throw new Error("ไม่สามารถโหลดข้อมูลคงเหลือได้");
      const data = await response.json();
      return data.inventory as InventoryItem[];
    },
    enabled: !!selectedEmployeeId && !!selectedStoreId,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Fetch recent transactions (increased limit for better summary metrics)
  const { data: transactionsData } = useQuery({
    queryKey: ["stock-transactions", selectedEmployeeId, selectedStoreId],
    queryFn: async () => {
      if (!selectedEmployeeId || !selectedStoreId) return [];
      const params = new URLSearchParams({
        employee_id: selectedEmployeeId,  // Fixed: use snake_case to match API
        store_id: selectedStoreId,        // Fixed: use snake_case to match API
        limit: "100", // Increased from 10 to 100 for better summary calculation
      });
      const response = await fetch(`/api/stock/transactions?${params.toString()}`);
      if (!response.ok) return [];
      const data = await response.json();
      const rawTransactions = Array.isArray(data.transactions) ? data.transactions : [];
      return rawTransactions.map((txn: Record<string, unknown>) => {
        const candidateType = [txn.transaction_type, txn.transactionType].find(
          (value): value is string =>
            typeof value === "string" && KNOWN_TRANSACTION_TYPES.includes(value as TransactionType)
        );
        const transactionType = (candidateType ?? "receive") as TransactionType;

        const productName =
          typeof txn.product_name === "string"
            ? txn.product_name
            : typeof txn.productName === "string"
              ? txn.productName
              : "";

        const unitName =
          typeof txn.unit_name === "string"
            ? txn.unit_name
            : typeof txn.unitName === "string"
              ? txn.unitName
              : "";

        const quantityValue = Number(txn.quantity);
        const quantity = Number.isFinite(quantityValue) ? quantityValue : 0;

        const createdAt =
          typeof txn.created_at === "string"
            ? txn.created_at
            : typeof txn.createdAt === "string"
              ? txn.createdAt
              : new Date().toISOString();

        const note = typeof txn.note === "string" && txn.note.trim().length > 0 ? txn.note : undefined;

        return {
          id: typeof txn.id === "string" ? txn.id : String(txn.id ?? ""),
          transactionType,
          productName,
          unitName,
          quantity,
          note,
          createdAt,
        } satisfies RecentTransaction;
      });
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
      // Convert camelCase to snake_case for API
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

  const employees = employeesData ?? [];
  const stores = storesData ?? [];
  const products = productsData ?? [];
  const inventory = inventoryData ?? [];
  const recentTransactions: RecentTransaction[] = transactionsData ?? [];
  const assignments = assignmentsData ?? [];

  // GPS Location Logic
  const ensureLocation = useCallback(
    async (options?: { force?: boolean }) => {
      const shouldForce = options?.force === true;
      const currentState = locationStateRef.current;
      if (!shouldForce && currentState.status === "resolved") {
        return currentState.coords;
      }
      if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
        const message = "อุปกรณ์ของคุณไม่รองรับการขอพิกัด";
        setLocationState({ status: "error", message });
        throw new Error(message);
      }
      setLocationState((prev) => {
        if (shouldForce) {
          if (prev.status === "locating") {
            return prev;
          }
          return { status: "locating" };
        }
        if (prev.status === "resolved" || prev.status === "locating") {
          return prev;
        }
        return { status: "locating" };
      });
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0,
          });
        });
        setLocationState({ status: "resolved", coords: position.coords });
        return position.coords;
      } catch (error) {
        let message = "ไม่สามารถดึงพิกัดได้";
        if (error instanceof GeolocationPositionError) {
          if (error.code === error.PERMISSION_DENIED) {
            message = "กรุณาอนุญาตการเข้าถึงตำแหน่งเพื่อใช้งานฟอร์ม";
          } else if (error.message) {
            message = error.message;
          }
        }
        setLocationState({ status: "error", message });
        throw new Error(message);
      }
    },
    []
  );

  useEffect(() => {
    void ensureLocation().catch(() => undefined);
  }, [ensureLocation]);

  const handleRefreshLocation = useCallback(() => {
    void ensureLocation({ force: true });
  }, [ensureLocation]);

  // Detect nearest store based on GPS
  const detectedStoreMatch = useMemo(() => {
    if (locationState.status !== "resolved") return null;
    const { latitude, longitude } = locationState.coords;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    const candidates = stores
      .map((store) => {
        if (
          typeof store.latitude !== "number" ||
          !Number.isFinite(store.latitude) ||
          typeof store.longitude !== "number" ||
          !Number.isFinite(store.longitude)
        ) {
          return null;
        }
        const radius =
          typeof store.radius === "number" && Number.isFinite(store.radius) ? store.radius : 100;
        const distance = haversineDistance(
          { latitude, longitude },
          { latitude: store.latitude, longitude: store.longitude }
        );
        return {
          store,
          distance,
          radius,
          withinRadius: distance <= radius,
        };
      })
      .filter(
        (
          candidate
        ): candidate is {
          store: Store;
          distance: number;
          radius: number;
          withinRadius: boolean;
        } => candidate !== null
      );
    if (candidates.length === 0) return null;
    const sorted = [...candidates].sort((a, b) => a.distance - b.distance);
    const withinRadius = sorted.find((candidate) => candidate.withinRadius);
    return withinRadius ?? sorted[0] ?? null;
  }, [locationState, stores]);

  const detectedStore = detectedStoreMatch?.store ?? null;
  const nearestDistanceMeters = detectedStoreMatch ? Math.round(detectedStoreMatch.distance) : null;

  // Restrict employees to detected store based on assignments
  const restrictedEmployees = useMemo(() => {
    if (!detectedStore) return [];
    // Find all employees assigned to the detected store
    const assignedEmployeeIds = assignments
      .filter((a) => a.storeId === detectedStore.id)
      .map((a) => a.employeeId);
    return employees.filter((employee) => assignedEmployeeIds.includes(employee.id));
  }, [detectedStore, employees, assignments]);

  const restrictedEmployeeIds = useMemo(
    () => restrictedEmployees.map((employee) => employee.id),
    [restrictedEmployees]
  );

  const visibleEmployees = useMemo(() => {
    if (!detectedStore || restrictedEmployees.length === 0) {
      return employees;
    }
    if (allowAllEmployees) {
      const set = new Set(restrictedEmployeeIds);
      const outOfArea = employees.filter((employee) => !set.has(employee.id));
      return [...restrictedEmployees, ...outOfArea];
    }
    return restrictedEmployees;
  }, [allowAllEmployees, detectedStore, employees, restrictedEmployeeIds, restrictedEmployees]);

  const isRestrictingEmployees = Boolean(
    detectedStore && restrictedEmployees.length > 0 && !allowAllEmployees
  );

  const isOutOfAreaSelection = Boolean(
    detectedStore &&
      restrictedEmployeeIds.length > 0 &&
      selectedEmployeeId &&
      !restrictedEmployeeIds.includes(selectedEmployeeId)
  );

  // Get stores assigned to the selected employee (must be before useEffect that depends on it)
  const selectedEmployeeStores = useMemo(() => {
    if (!selectedEmployeeId) return [];
    const employeeAssignments = assignments.filter((a) => a.employeeId === selectedEmployeeId);
    const assignedStoreIds = employeeAssignments.map((a) => a.storeId);
    return stores.filter((store) => assignedStoreIds.includes(store.id));
  }, [selectedEmployeeId, assignments, stores]);

  const selectedEmployeePrimaryStoreId = useMemo(() => {
    if (!selectedEmployeeId) return null;
    const primaryAssignment = assignments.find(
      (a) => a.employeeId === selectedEmployeeId && a.isPrimary
    );
    return primaryAssignment?.storeId ?? null;
  }, [selectedEmployeeId, assignments]);

  // Auto-select store based on GPS and employee assignments
  useEffect(() => {
    // Don't auto-select if user has explicitly overridden or no GPS detection
    if (allowStoreOverride || !detectedStore) {
      return;
    }

    // If no employee selected, just use GPS detected store
    if (!selectedEmployeeId) {
      setSelectedStoreId((prev) => (prev === detectedStore.id ? prev : detectedStore.id));
      return;
    }

    // Check if the selected employee is assigned to the detected store
    const isEmployeeAssignedToDetectedStore = assignments.some(
      (a) => a.employeeId === selectedEmployeeId && a.storeId === detectedStore.id
    );

    if (isEmployeeAssignedToDetectedStore) {
      // Employee is assigned to GPS-detected store, auto-select it
      setSelectedStoreId((prev) => (prev === detectedStore.id ? prev : detectedStore.id));
    } else if (selectedEmployeeStores.length === 1) {
      // Employee has only one assigned store (not the detected one), use it
      setSelectedStoreId((prev) =>
        prev === selectedEmployeeStores[0].id ? prev : selectedEmployeeStores[0].id
      );
    } else if (selectedEmployeePrimaryStoreId) {
      // Employee has multiple stores, use primary store
      setSelectedStoreId((prev) =>
        prev === selectedEmployeePrimaryStoreId ? prev : selectedEmployeePrimaryStoreId
      );
    }
    // Otherwise, let user choose from dropdown
  }, [
    allowStoreOverride,
    detectedStore,
    selectedEmployeeId,
    assignments,
    selectedEmployeeStores,
    selectedEmployeePrimaryStoreId,
  ]);

  useEffect(() => {
    setAllowStoreOverride(false);
  }, [detectedStore?.id]);

  // Auto-select employee based on detected store
  useEffect(() => {
    if (!detectedStore || restrictedEmployeeIds.length === 0 || allowAllEmployees) {
      return;
    }
    setSelectedEmployeeId((prev) =>
      prev && restrictedEmployeeIds.includes(prev) ? prev : restrictedEmployeeIds[0] ?? ""
    );
  }, [allowAllEmployees, detectedStore, restrictedEmployeeIds]);

  useEffect(() => {
    setAllowAllEmployees(false);
  }, [detectedStore?.id]);

  // Restore last selected employee and store
  useEffect(() => {
    if (typeof window === "undefined" || selectedEmployeeId || employees.length === 0) return;
    const storedId = window.localStorage.getItem(LAST_EMPLOYEE_STORAGE_KEY);
    if (storedId && employees.some((emp) => emp.id === storedId)) {
      setSelectedEmployeeId(storedId);
    }
  }, [employees, selectedEmployeeId]);

  useEffect(() => {
    if (typeof window === "undefined" || selectedStoreId || stores.length === 0) return;
    const storedId = window.localStorage.getItem(LAST_STORE_STORAGE_KEY);
    if (storedId && stores.some((store) => store.id === storedId)) {
      setSelectedStoreId(storedId);
    }
  }, [stores, selectedStoreId]);

  // Save selected employee and store
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedEmployeeId) {
      window.localStorage.setItem(LAST_EMPLOYEE_STORAGE_KEY, selectedEmployeeId);
    } else {
      window.localStorage.removeItem(LAST_EMPLOYEE_STORAGE_KEY);
    }
  }, [selectedEmployeeId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (selectedStoreId) {
      window.localStorage.setItem(LAST_STORE_STORAGE_KEY, selectedStoreId);
    } else {
      window.localStorage.removeItem(LAST_STORE_STORAGE_KEY);
    }
  }, [selectedStoreId]);

  // Auto-select default store for employee
  useEffect(() => {
    const selectedEmployee = employees.find((emp) => emp.id === selectedEmployeeId);
    if (selectedEmployee?.default_store_id && !selectedStoreId) {
      setSelectedStoreId(selectedEmployee.default_store_id);
    }
  }, [selectedEmployeeId, employees, selectedStoreId]);

  // Computed values
  const selectedEmployee = useMemo(
    () => employees.find((emp) => emp.id === selectedEmployeeId),
    [employees, selectedEmployeeId]
  );

  const selectedStore = useMemo(
    () => stores.find((store) => store.id === selectedStoreId),
    [stores, selectedStoreId]
  );

  const selectedReceiveProduct = useMemo(
    () => products.find((prod) => prod.productId === receiveProductId),
    [products, receiveProductId]
  );

  const selectedReturnProduct = useMemo(
    () => products.find((prod) => prod.productId === returnProductId),
    [products, returnProductId]
  );

  const selectedInitialProduct = useMemo(
    () => products.find((prod) => prod.productId === initialProductId),
    [products, initialProductId]
  );

  const locationSummary = useMemo(() => {
    if (locationState.status !== "resolved") return "";
    const { latitude, longitude, accuracy } = locationState.coords;
    const lat = latitude.toFixed(6);
    const lng = longitude.toFixed(6);
    const acc =
      typeof accuracy === "number" && Number.isFinite(accuracy) ? `±${Math.round(accuracy)}ม.` : "";
    return `ละติจูด ${lat}, ลองจิจูด ${lng}${acc ? ` (${acc})` : ""}`;
  }, [locationState]);

  // Summary metrics with unit breakdowns
  const totalProducts = inventory.length;

  // Calculate totalIn by unit: group all positive quantity transactions by unit
  const totalInByUnit = useMemo(() => {
    const unitMap = new Map<string, number>();
    recentTransactions
      .filter((t) => t.quantity > 0)
      .forEach((t) => {
        const current = unitMap.get(t.unitName) || 0;
        unitMap.set(t.unitName, current + t.quantity);
      });
    return unitMap;
  }, [recentTransactions]);

  // Calculate totalOut by unit: group all negative quantity transactions by unit
  const totalOutByUnit = useMemo(() => {
    const unitMap = new Map<string, number>();
    recentTransactions
      .filter((t) => t.quantity < 0)
      .forEach((t) => {
        const current = unitMap.get(t.unitName) || 0;
        unitMap.set(t.unitName, current + Math.abs(t.quantity));
      });
    return unitMap;
  }, [recentTransactions]);

  // Calculate balance by unit: group inventory by unit
  const balanceByUnit = useMemo(() => {
    const unitMap = new Map<string, number>();
    inventory.forEach((item) => {
      const current = unitMap.get(item.unitName) || 0;
      unitMap.set(item.unitName, current + item.balance);
    });
    return unitMap;
  }, [inventory]);

  // Legacy totals for low stock calculation
  const totalBalance = inventory.reduce((sum, item) => sum + item.balance, 0);
  const lowStockCount = inventory.filter((item) => item.balance > 0 && item.balance <= 10).length;

  // Helper function to format unit breakdown (e.g., "20 ลัง 20แพ็ค 10ซอง")
  const formatUnitBreakdown = useCallback((unitMap: Map<string, number>) => {
    if (unitMap.size === 0) return "0 หน่วย";
    const entries = Array.from(unitMap.entries())
      .filter(([_, qty]) => qty > 0)
      .map(([unitName, qty]) => `${qty.toLocaleString("th-TH")} ${unitName}`);
    return entries.length > 0 ? entries.join(" ") : "0 หน่วย";
  }, []);

  // Formatted breakdowns for display
  const totalInFormatted = formatUnitBreakdown(totalInByUnit);
  const totalOutFormatted = formatUnitBreakdown(totalOutByUnit);
  const totalBalanceFormatted = formatUnitBreakdown(balanceByUnit);

  // Handlers
  const handleEmployeeChange = useCallback((empId: string) => {
    setSelectedEmployeeId(empId);
    setSubmitState({ status: "idle" });
  }, []);

  const handleStoreChange = useCallback((storeId: string) => {
    setSelectedStoreId(storeId);
    setSubmitState({ status: "idle" });
  }, []);

  const resetReceiveForm = useCallback(() => {
    setReceiveProductId("");
    setReceiveUnitQuantities({});
    setReceiveNote("");
  }, []);

  const resetReturnForm = useCallback(() => {
    setReturnProductId("");
    setReturnUnitQuantities({});
    setReturnNote("");
  }, []);

  const resetInitialForm = useCallback(() => {
    setInitialProductId("");
    setInitialUnitQuantities({});
    setInitialNote("");
  }, []);

  const addToCart = useCallback(() => {
    if (!receiveProductId) {
      setSubmitState({ status: "error", message: "กรุณาเลือกสินค้า" });
      return;
    }

    const selectedProduct = products.find((p) => p.productId === receiveProductId);
    if (!selectedProduct) {
      setSubmitState({ status: "error", message: "ไม่พบข้อมูลสินค้า" });
      return;
    }

    // Collect all units with quantity > 0
    const itemsToAdd: CartItem[] = [];

    for (const unit of selectedProduct.units) {
      const quantityStr = receiveUnitQuantities[unit.unitId];
      if (!quantityStr || !quantityStr.trim()) continue;

      const quantity = parseFloat(quantityStr);
      if (!Number.isFinite(quantity) || quantity <= 0) continue;

      itemsToAdd.push({
        productId: receiveProductId,
        productCode: selectedProduct.productCode,
        productName: selectedProduct.productName,
        unitId: unit.unitId,
        unitName: unit.unitName,
        quantity,
        note: receiveNote.trim() || undefined,
      });
    }

    if (itemsToAdd.length === 0) {
      setSubmitState({ status: "error", message: "กรุณาระบุจำนวนอย่างน้อย 1 หน่วย" });
      return;
    }

    setReceiveCart((prev) => [...prev, ...itemsToAdd]);
    resetReceiveForm();
    setSubmitState({ status: "idle" });
  }, [receiveProductId, receiveUnitQuantities, receiveNote, products, resetReceiveForm]);

  const removeFromCart = useCallback((index: number) => {
    setReceiveCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearCart = useCallback(() => {
    setReceiveCart([]);
    setReceiveGlobalNote("");
  }, []);

  // Return cart functions
  const addToReturnCart = useCallback(() => {
    if (!returnProductId) {
      setSubmitState({ status: "error", message: "กรุณาเลือกสินค้า" });
      return;
    }

    const selectedProduct = products.find((p) => p.productId === returnProductId);
    if (!selectedProduct) {
      setSubmitState({ status: "error", message: "ไม่พบข้อมูลสินค้า" });
      return;
    }

    // Collect all units with quantity > 0
    const itemsToAdd: CartItem[] = [];

    for (const unit of selectedProduct.units) {
      const quantityStr = returnUnitQuantities[unit.unitId];
      if (!quantityStr || !quantityStr.trim()) continue;

      const quantity = parseFloat(quantityStr);
      if (!Number.isFinite(quantity) || quantity <= 0) continue;

      // Check balance for this unit
      const balance = inventory.find(
        (item) => item.productId === returnProductId && item.unitId === unit.unitId
      );

      if (balance && quantity > balance.balance) {
        setSubmitState({
          status: "error",
          message: `${unit.unitName}: จำนวนเกินคงเหลือ (มีเพียง ${balance.balance.toLocaleString("th-TH")} ${unit.unitName})`,
        });
        return;
      }

      if (!balance || balance.balance === 0) {
        setSubmitState({
          status: "error",
          message: `${unit.unitName}: ไม่มีสต็อกคงเหลือให้คืน`,
        });
        return;
      }

      itemsToAdd.push({
        productId: returnProductId,
        productCode: selectedProduct.productCode,
        productName: selectedProduct.productName,
        unitId: unit.unitId,
        unitName: unit.unitName,
        quantity,
        note: returnNote.trim() || undefined,
      });
    }

    if (itemsToAdd.length === 0) {
      setSubmitState({ status: "error", message: "กรุณาระบุจำนวนอย่างน้อย 1 หน่วย" });
      return;
    }

    setReturnCart((prev) => [...prev, ...itemsToAdd]);
    resetReturnForm();
    setSubmitState({ status: "idle" });
  }, [returnProductId, returnUnitQuantities, returnNote, products, inventory, resetReturnForm]);

  const removeFromReturnCart = useCallback((index: number) => {
    setReturnCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearReturnCart = useCallback(() => {
    setReturnCart([]);
    setReturnGlobalNote("");
  }, []);

  // Adjustment cart functions
  const addToAdjustmentCart = useCallback(() => {
    if (!initialProductId) {
      setSubmitState({ status: "error", message: "กรุณาเลือกสินค้า" });
      return;
    }

    const selectedProduct = products.find((p) => p.productId === initialProductId);
    if (!selectedProduct) {
      setSubmitState({ status: "error", message: "ไม่พบข้อมูลสินค้า" });
      return;
    }

    // Collect all units with quantity >= 0
    const itemsToAdd: CartItem[] = [];

    for (const unit of selectedProduct.units) {
      const quantityStr = initialUnitQuantities[unit.unitId];
      if (!quantityStr || !quantityStr.trim()) continue;

      const quantity = parseFloat(quantityStr);
      if (!Number.isFinite(quantity) || quantity < 0) continue;

      itemsToAdd.push({
        productId: initialProductId,
        productCode: selectedProduct.productCode,
        productName: selectedProduct.productName,
        unitId: unit.unitId,
        unitName: unit.unitName,
        quantity,
        note: initialNote.trim() || undefined,
      });
    }

    if (itemsToAdd.length === 0) {
      setSubmitState({ status: "error", message: "กรุณาระบุจำนวนอย่างน้อย 1 หน่วย" });
      return;
    }

    setAdjustmentCart((prev) => [...prev, ...itemsToAdd]);
    resetInitialForm();
    setSubmitState({ status: "idle" });
  }, [initialProductId, initialUnitQuantities, initialNote, products, resetInitialForm]);

  const removeFromAdjustmentCart = useCallback((index: number) => {
    setAdjustmentCart((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearAdjustmentCart = useCallback(() => {
    setAdjustmentCart([]);
    setAdjustmentGlobalNote("");
  }, []);

  const handleReceiveSubmit = useCallback(
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

      if (receiveCart.length === 0) {
        setSubmitState({ status: "error", message: "กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ" });
        return;
      }

      setSubmitState({ status: "submitting" });

      try {
        // Submit all items in cart
        for (const item of receiveCart) {
          const note = receiveGlobalNote.trim()
            ? `${receiveGlobalNote}${item.note ? ` | ${item.note}` : ""}`
            : item.note;

          await transactionMutation.mutateAsync({
            transactionType: "receive",
            employeeId: selectedEmployeeId,
            storeId: selectedStoreId,
            productId: item.productId,
            unitId: item.unitId,
            quantity: Math.round(item.quantity), // Ensure integer
            note: note || undefined,
          });
        }

        setSubmitState({
          status: "success",
          message: `บันทึกรับเข้าเรียบร้อย (${receiveCart.length} รายการ)`,
        });
        clearCart();
        setIsReceiveModalOpen(false);

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
      receiveCart,
      receiveGlobalNote,
      transactionMutation,
      clearCart,
    ]
  );

  const handleReturnSubmit = useCallback(
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

      if (returnCart.length === 0) {
        setSubmitState({ status: "error", message: "กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ" });
        return;
      }

      setSubmitState({ status: "submitting" });

      try {
        // Submit all items in cart
        for (const item of returnCart) {
          const note = returnGlobalNote.trim()
            ? `${returnGlobalNote}${item.note ? ` | ${item.note}` : ""}`
            : item.note;

          await transactionMutation.mutateAsync({
            transactionType: "return",
            employeeId: selectedEmployeeId,
            storeId: selectedStoreId,
            productId: item.productId,
            unitId: item.unitId,
            quantity: Math.round(item.quantity), // Ensure integer
            note: note || undefined,
          });
        }

        setSubmitState({
          status: "success",
          message: `บันทึกคืนสินค้าเรียบร้อย (${returnCart.length} รายการ)`,
        });
        clearReturnCart();
        setIsReturnModalOpen(false);

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
      returnCart,
      returnGlobalNote,
      transactionMutation,
      clearReturnCart,
    ]
  );

  const handleInitialSubmit = useCallback(
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

      if (adjustmentCart.length === 0) {
        setSubmitState({ status: "error", message: "กรุณาเพิ่มสินค้าอย่างน้อย 1 รายการ" });
        return;
      }

      setSubmitState({ status: "submitting" });

      try {
        // Submit all items in cart
        for (const item of adjustmentCart) {
          const globalNote = adjustmentGlobalNote.trim();
          const itemNote = item.note;
          const noteText = globalNote
            ? `ตั้งค่าสต็อกเริ่มต้น: ${globalNote}${itemNote ? ` | ${itemNote}` : ""}`
            : itemNote
              ? `ตั้งค่าสต็อกเริ่มต้น: ${itemNote}`
              : "ตั้งค่าสต็อกเริ่มต้น";

          // TODO: API should support transactionType: "initial"
          // For now, using "receive" as a workaround
          await transactionMutation.mutateAsync({
            transactionType: "receive",
            employeeId: selectedEmployeeId,
            storeId: selectedStoreId,
            productId: item.productId,
            unitId: item.unitId,
            quantity: Math.round(item.quantity), // Ensure integer
            note: noteText,
          });
        }

        setSubmitState({
          status: "success",
          message: `บันทึกสต็อกเริ่มต้นเรียบร้อย (${adjustmentCart.length} รายการ)`,
        });
        clearAdjustmentCart();
        setIsInitialModalOpen(false);

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
      adjustmentCart,
      adjustmentGlobalNote,
      transactionMutation,
      clearAdjustmentCart,
    ]
  );


  // Display labels
  const employeeLabel = selectedEmployee
    ? `${selectedEmployee.name}${selectedEmployee.employee_code ? ` (${selectedEmployee.employee_code})` : ""}`
    : "ยังไม่เลือก";

  const storeLabel = selectedStore ? selectedStore.name : "ยังไม่เลือก";

  // Transaction icons and colors
  const transactionIcons: Record<TransactionType, React.ReactElement> = {
    receive: <PackagePlus className="h-4 w-4" />,
    sale: <ShoppingCart className="h-4 w-4" />,
    return: <PackageMinus className="h-4 w-4" />,
    initial: <PackageCheck className="h-4 w-4" />,
    adjustment: <Settings className="h-4 w-4" />, // Still needed for transaction list display
  };

  const transactionColors: Record<TransactionType, string> = {
    receive: "from-blue-500 to-cyan-500",
    sale: "from-orange-500 to-amber-500",
    return: "from-indigo-500 to-purple-500",
    initial: "from-sky-500 to-blue-500",
    adjustment: "from-slate-500 to-gray-500", // Still needed for transaction list display
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-blue-50/80 via-white to-sky-50/60">
      {/* Background decorations */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-200/30 blur-[140px]" />
        <div className="absolute bottom-[-200px] right-[-160px] h-[640px] w-[640px] rounded-full bg-sky-200/25 blur-[200px]" />
        <div className="absolute top-1/3 left-[-160px] h-[440px] w-[440px] rounded-full bg-indigo-100/30 blur-[180px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.08),_transparent_65%)]" />
      </div>

      <SiteNav />

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pb-12 pt-[106px] sm:px-6 lg:px-8">

        {/* Header */}
        <header className="space-y-6 rounded-3xl border border-blue-100 bg-white/90 p-6 shadow-[0_20px_60px_-45px_rgba(37,99,235,0.5)] backdrop-blur-xl sm:p-10">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 via-sky-500 to-indigo-500 shadow-lg">
                <Package className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-400">
                  Stock Management
                </p>
                <h1 className="text-3xl font-bold text-blue-900">จัดการสต็อกสินค้า</h1>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              บันทึกการรับเข้า-คืนสินค้า ตั้งค่าสต็อกเริ่มต้น และปรับปรุงยอดคงเหลือ
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1.5 text-xs font-medium text-blue-700">
                <User className="h-3.5 w-3.5" />
                {employeeLabel}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50/80 px-3.5 py-1.5 text-xs font-medium text-sky-700">
                <Building2 className="h-3.5 w-3.5" />
                {storeLabel}
              </span>
            </div>
          </div>

          {isReadOnly && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 flex-shrink-0 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    โหมดดูอย่างเดียว (Read-Only)
                  </p>
                  <p className="mt-1 text-xs text-blue-700">
                    คุณสามารถดูข้อมูลได้เท่านั้น ไม่สามารถแก้ไขหรือบันทึกข้อมูลใหม่ได้
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Employee and Store Selection with GPS */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-blue-700" htmlFor="employee-select">
                <User className="h-4 w-4 text-blue-600" />
                พนักงาน
              </label>
              {isLoadingEmployees ? (
                <div className="form-input flex h-[52px] items-center justify-center text-xs text-slate-400">
                  <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-b-transparent mr-2" />
                  กำลังโหลด...
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    id="employee-select"
                    value={selectedEmployeeId}
                    onChange={(e) => handleEmployeeChange(e.target.value)}
                    className={`form-input ${isReadOnly ? 'cursor-not-allowed opacity-60' : ''}`}
                    disabled={isReadOnly}
                    required
                  >
                    <option value="">เลือกพนักงาน</option>
                    {visibleEmployees.map((emp) => {
                      const assignedStore = emp.default_store_id
                        ? stores.find((store) => store.id === emp.default_store_id)
                        : null;
                      const label = assignedStore ? `${emp.name} - ${assignedStore.name}` : emp.name;
                      const isEmployeeOutOfArea =
                        detectedStore &&
                        restrictedEmployeeIds.length > 0 &&
                        emp.default_store_id !== detectedStore.id;
                      const displayLabel = isEmployeeOutOfArea
                        ? `${label} (นอกพื้นที่ที่ตรวจจับได้)`
                        : label;
                      return (
                        <option key={emp.id} value={emp.id}>
                          {displayLabel}
                          {emp.employee_code ? ` (${emp.employee_code})` : ""}
                        </option>
                      );
                    })}
                  </select>
                  {isRestrictingEmployees && detectedStore && (
                    <p className="text-xs text-blue-600">
                      แสดงเฉพาะพนักงานของสาขา {detectedStore.name} ตามพิกัดปัจจุบัน{" "}
                      <button
                        type="button"
                        onClick={() => setAllowAllEmployees(true)}
                        className="font-semibold hover:underline"
                      >
                        เลือกชื่ออื่น
                      </button>
                    </p>
                  )}
                  {allowAllEmployees && detectedStore && restrictedEmployeeIds.length > 0 && (
                    <div className="space-y-1 text-xs text-amber-600">
                      <p>มีรายชื่อที่ไม่ตรงกับสาขาที่ตรวจจับได้ ตรวจสอบก่อนบันทึก</p>
                      <button
                        type="button"
                        onClick={() => setAllowAllEmployees(false)}
                        className="font-semibold text-blue-600 hover:underline"
                      >
                        กลับไปกรองตามพิกัด
                      </button>
                    </div>
                  )}
                  {isOutOfAreaSelection && (
                    <p className="text-xs text-amber-600">
                      ตรวจสอบอีกครั้ง: คุณเลือกพนักงานที่อยู่นอกสาขาที่ตรวจจับได้
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-blue-700" htmlFor="store-select">
                <Building2 className="h-4 w-4 text-blue-600" />
                ร้านค้า / หน่วยงาน
              </label>
              {isLoadingStores ? (
                <div className="form-input flex h-[52px] items-center justify-center text-xs text-slate-400">
                  <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-b-transparent mr-2" />
                  กำลังโหลด...
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    id="store-select"
                    value={selectedStoreId}
                    onChange={(e) => handleStoreChange(e.target.value)}
                    className={`form-input disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 ${isReadOnly ? 'opacity-60' : ''}`}
                    disabled={isReadOnly || (!!detectedStore && !allowStoreOverride)}
                    required
                  >
                    <option value="">เลือกร้านค้า</option>
                    {/* Show only assigned stores if employee is selected, otherwise show all */}
                    {(selectedEmployeeId && selectedEmployeeStores.length > 0
                      ? selectedEmployeeStores
                      : stores
                    ).map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                        {store.province ? ` (${store.province})` : ""}
                      </option>
                    ))}
                  </select>
                  {detectedStore && (
                    <div className="space-y-2 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-medium text-emerald-700">
                          <MapPin className="h-3.5 w-3.5" />
                          ใกล้ {detectedStore.name}
                          {nearestDistanceMeters !== null && ` (${nearestDistanceMeters} ม.)`}
                        </span>
                        <div className="flex gap-2">
                          {!allowStoreOverride && (
                            <button
                              type="button"
                              onClick={() => setAllowStoreOverride(true)}
                              className="inline-flex items-center gap-1 font-medium text-blue-600 transition hover:text-blue-700"
                            >
                              เลือกสาขาอื่น
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          )}
                          {allowStoreOverride && (
                            <button
                              type="button"
                              onClick={() => setAllowStoreOverride(false)}
                              className="inline-flex items-center gap-1 font-medium text-blue-600 transition hover:text-blue-700"
                            >
                              กลับไปใช้พิกัด
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={handleRefreshLocation}
                            className="inline-flex items-center gap-1 font-medium text-blue-600 transition hover:text-blue-700"
                          >
                            <RefreshCw className="h-3 w-3" />
                            รีเฟรช
                          </button>
                        </div>
                      </div>
                      {locationState.status === "locating" && (
                        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-2 text-blue-700">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>กำลังตรวจจับตำแหน่ง...</span>
                        </div>
                      )}
                      {locationState.status === "resolved" && (
                        <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
                          <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" />
                          <span className="text-xs">{locationSummary}</span>
                        </div>
                      )}
                      {locationState.status === "error" && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-600">
                          <div className="flex items-start gap-2">
                            <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{locationState.message}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {permissionStatus === "prompt" && (
                                  <button
                                    type="button"
                                    onClick={() => void requestPermission()}
                                    className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm transition hover:bg-red-100"
                                  >
                                    อนุญาตตำแหน่ง
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={handleRefreshLocation}
                                  className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-600 shadow-sm transition hover:bg-red-100"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  ลองอีกครั้ง
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Summary Cards - 2x2 Grid on Mobile */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="group rounded-3xl border border-white/70 bg-white/90 p-4 sm:p-6 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl backdrop-blur-xl">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  รับเข้า
                </p>
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-500 shadow-lg transition-all duration-200 group-hover:scale-110">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/20 border border-white/40">
                    <PackagePlus className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-base sm:text-lg font-bold text-blue-900 break-words">
                  {totalInFormatted}
                </p>
              </div>
            </div>
          </div>

          <div className="group rounded-3xl border border-white/70 bg-white/90 p-4 sm:p-6 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl backdrop-blur-xl">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  จ่ายออก
                </p>
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-500 to-purple-500 shadow-lg transition-all duration-200 group-hover:scale-110">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/20 border border-white/40">
                    <PackageMinus className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-base sm:text-lg font-bold text-blue-900 break-words">
                  {totalOutFormatted}
                </p>
              </div>
            </div>
          </div>

          <div className="group rounded-3xl border border-white/70 bg-white/90 p-4 sm:p-6 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl backdrop-blur-xl">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  คงเหลือ
                </p>
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 via-blue-400 to-indigo-400 shadow-lg transition-all duration-200 group-hover:scale-110">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/20 border border-white/40">
                    <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-base sm:text-lg font-bold text-blue-900 break-words">
                  {totalBalanceFormatted}
                </p>
              </div>
            </div>
          </div>

          <div className="group rounded-3xl border border-white/70 bg-white/90 p-4 sm:p-6 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl backdrop-blur-xl">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  สต็อกต่ำ
                </p>
                <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-orange-400 to-red-500 shadow-lg transition-all duration-200 group-hover:scale-110">
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-white/20 border border-white/40">
                    <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-base sm:text-lg font-bold text-amber-600 break-words">
                  {lowStockCount.toLocaleString("th-TH")} รายการ
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="rounded-3xl border border-blue-100 bg-white/90 p-6 shadow-[0_20px_60px_-45px_rgba(37,99,235,0.5)] backdrop-blur-xl sm:p-10">
          {/* Tab Navigation */}
          <div className="mb-8 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab("receive");
                setSubmitState({ status: "idle" });
              }}
              className={`flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all duration-200 ${
                activeTab === "receive"
                  ? "bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500 text-white shadow-[0_20px_60px_-45px_rgba(37,99,235,0.9)]"
                  : "border border-blue-100 bg-white/90 text-blue-600 hover:border-blue-300 hover:bg-blue-50/50"
              }`}
            >
              <PackagePlus className="h-5 w-5" />
              รับเข้า
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("return");
                setSubmitState({ status: "idle" });
              }}
              className={`flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all duration-200 ${
                activeTab === "return"
                  ? "bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500 text-white shadow-[0_20px_60px_-45px_rgba(37,99,235,0.9)]"
                  : "border border-blue-100 bg-white/90 text-blue-600 hover:border-blue-300 hover:bg-blue-50/50"
              }`}
            >
              <PackageMinus className="h-5 w-5" />
              คืนสินค้า
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("initial");
                setSubmitState({ status: "idle" });
              }}
              className={`flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all duration-200 ${
                activeTab === "initial"
                  ? "bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500 text-white shadow-[0_20px_60px_-45px_rgba(37,99,235,0.9)]"
                  : "border border-blue-100 bg-white/90 text-blue-600 hover:border-blue-300 hover:bg-blue-50/50"
              }`}
            >
              <PackageCheck className="h-5 w-5" />
              ตั้งค่าสต็อกเริ่มต้น
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("balance");
                setSubmitState({ status: "idle" });
              }}
              className={`flex items-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold transition-all duration-200 ${
                activeTab === "balance"
                  ? "bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500 text-white shadow-[0_20px_60px_-45px_rgba(37,99,235,0.9)]"
                  : "border border-blue-100 bg-white/90 text-blue-600 hover:border-blue-300 hover:bg-blue-50/50"
              }`}
            >
              <Package className="h-5 w-5" />
              สต็อกคงเหลือ
            </button>
          </div>

          {/* Submit State Messages */}
          {submitState.status === "error" && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <span className="font-medium">{submitState.message}</span>
            </div>
          )}
          {submitState.status === "success" && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-600">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <span className="font-medium">{submitState.message}</span>
            </div>
          )}

          {/* Tab Content Container */}
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            {/* Main Form Section */}
            <div>
              {/* Tab: Receive */}
              {activeTab === "receive" && (
                <div className="space-y-6">
                  {/* Add to Cart Button */}
                  <button
                    type="button"
                    onClick={() => setIsReceiveModalOpen(true)}
                    disabled={!selectedEmployeeId || !selectedStoreId || isReadOnly}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-[26px] border-2 border-dashed border-blue-400 bg-blue-50/50 px-6 py-4 text-base font-semibold text-blue-700 transition-all duration-200 hover:border-blue-500 hover:bg-blue-100/50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${isReadOnly ? 'opacity-50' : ''}`}
                  >
                    <PackagePlus className="h-5 w-5" />
                    เพิ่มรายการรับเข้า
                  </button>

                  {/* Cart Items Display */}
                  {receiveCart.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                          <ShoppingCart className="h-4 w-4" />
                          รายการในตะกร้า ({receiveCart.length})
                        </h3>
                        <button
                          type="button"
                          onClick={clearCart}
                          className="text-xs font-medium text-red-600 transition hover:text-red-700"
                        >
                          ล้างทั้งหมด
                        </button>
                      </div>

                      <div className="space-y-3">
                        {receiveCart.map((item, index) => (
                          <div
                            key={index}
                            className="group relative overflow-hidden rounded-2xl border border-blue-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-sky-400">
                                <Package className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-blue-900">
                                  {item.productCode} - {item.productName}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  <span className="font-medium text-blue-700">
                                    {item.quantity.toLocaleString("th-TH")}
                                  </span>{" "}
                                  {item.unitName}
                                </p>
                                {item.note && (
                                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                                    {item.note}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFromCart(index)}
                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 transition hover:bg-red-200 hover:text-red-700"
                                title="ลบรายการ"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Global Note for All Items */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-blue-700" htmlFor="global-note">
                          <Info className="h-4 w-4 text-blue-600" />
                          หมายเหตุสำหรับทั้งหมด (ไม่บังคับ)
                        </label>
                        <textarea
                          id="global-note"
                          value={receiveGlobalNote}
                          onChange={(e) => setReceiveGlobalNote(e.target.value)}
                          className="form-input min-h-[80px] resize-y"
                          placeholder="ระบุหมายเหตุที่ใช้ร่วมกันสำหรับทุกรายการ..."
                        />
                      </div>

                      {/* Submit All Button */}
                      <form onSubmit={handleReceiveSubmit}>
                        <button
                          type="submit"
                          disabled={submitState.status === "submitting" || isReadOnly}
                          className={`inline-flex w-full items-center justify-center gap-2 rounded-[26px] bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500 px-6 py-4 text-base font-semibold text-white shadow-[0_25px_80px_-50px_rgba(37,99,235,0.75)] transition-all duration-200 hover:shadow-[0_30px_90px_-55px_rgba(37,99,235,0.85)] focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 ${isReadOnly ? 'opacity-50' : ''}`}
                        >
                          {submitState.status === "submitting" ? (
                            <>
                              <RefreshCw className="h-5 w-5 animate-spin" />
                              กำลังบันทึก...
                            </>
                          ) : (
                            <>
                              <Save className="h-5 w-5" />
                              บันทึกทั้งหมด ({receiveCart.length} รายการ)
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Empty State */}
                  {receiveCart.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-blue-200 bg-blue-50/30 px-6 py-12 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-sky-400 shadow-lg">
                        <ShoppingCart className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-sm font-medium text-blue-700">
                        ยังไม่มีรายการในตะกร้า
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        กดปุ่ม &quot;เพิ่มรายการรับเข้า&quot; เพื่อเริ่มเพิ่มสินค้า
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Return */}
              {activeTab === "return" && (
                <div className="space-y-6">
                  {/* Add to Cart Button */}
                  <button
                    type="button"
                    onClick={() => setIsReturnModalOpen(true)}
                    disabled={!selectedEmployeeId || !selectedStoreId || isReadOnly}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-[26px] border-2 border-dashed border-indigo-400 bg-indigo-50/50 px-6 py-4 text-base font-semibold text-indigo-700 transition-all duration-200 hover:border-indigo-500 hover:bg-indigo-100/50 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${isReadOnly ? 'opacity-50' : ''}`}
                  >
                    <PackageMinus className="h-5 w-5" />
                    เพิ่มรายการคืนสินค้า
                  </button>

                  {/* Cart Items Display */}
                  {returnCart.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                          <ShoppingCart className="h-4 w-4" />
                          รายการในตะกร้า ({returnCart.length})
                        </h3>
                        <button
                          type="button"
                          onClick={clearReturnCart}
                          className="text-xs font-medium text-red-600 transition hover:text-red-700"
                        >
                          ล้างทั้งหมด
                        </button>
                      </div>

                      <div className="space-y-3">
                        {returnCart.map((item, index) => (
                          <div
                            key={index}
                            className="group relative overflow-hidden rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-400">
                                <Package className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-blue-900">
                                  {item.productCode} - {item.productName}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  <span className="font-medium text-indigo-700">
                                    {item.quantity.toLocaleString("th-TH")}
                                  </span>{" "}
                                  {item.unitName}
                                </p>
                                {item.note && (
                                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                                    {item.note}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFromReturnCart(index)}
                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 transition hover:bg-red-200 hover:text-red-700"
                                title="ลบรายการ"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Global Note for All Items */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-blue-700" htmlFor="return-global-note">
                          <Info className="h-4 w-4 text-blue-600" />
                          หมายเหตุสำหรับทั้งหมด (ไม่บังคับ)
                        </label>
                        <textarea
                          id="return-global-note"
                          value={returnGlobalNote}
                          onChange={(e) => setReturnGlobalNote(e.target.value)}
                          className="form-input min-h-[80px] resize-y"
                          placeholder="ระบุหมายเหตุที่ใช้ร่วมกันสำหรับทุกรายการ..."
                        />
                      </div>

                      {/* Submit All Button */}
                      <form onSubmit={handleReturnSubmit}>
                        <button
                          type="submit"
                          disabled={submitState.status === "submitting" || isReadOnly}
                          className={`inline-flex w-full items-center justify-center gap-2 rounded-[26px] bg-gradient-to-r from-indigo-600 via-purple-500 to-blue-500 px-6 py-4 text-base font-semibold text-white shadow-[0_25px_80px_-50px_rgba(99,102,241,0.75)] transition-all duration-200 hover:shadow-[0_30px_90px_-55px_rgba(99,102,241,0.85)] focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 ${isReadOnly ? 'opacity-50' : ''}`}
                        >
                          {submitState.status === "submitting" ? (
                            <>
                              <RefreshCw className="h-5 w-5 animate-spin" />
                              กำลังบันทึก...
                            </>
                          ) : (
                            <>
                              <Save className="h-5 w-5" />
                              บันทึกทั้งหมด ({returnCart.length} รายการ)
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Empty State */}
                  {returnCart.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-indigo-200 bg-indigo-50/30 px-6 py-12 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-400 shadow-lg">
                        <ShoppingCart className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-sm font-medium text-indigo-700">
                        ยังไม่มีรายการในตะกร้า
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        กดปุ่ม &quot;เพิ่มรายการคืนสินค้า&quot; เพื่อเริ่มเพิ่มสินค้า
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Initial Stock */}
              {activeTab === "initial" && (
                <div className="space-y-6">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                    <div className="flex items-start gap-2">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-700">
                        ใช้สำหรับกรอกจำนวนสินค้าที่มีอยู่เดิม เมื่อเริ่มใช้ระบบครั้งแรก
                      </p>
                    </div>
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    type="button"
                    onClick={() => setIsInitialModalOpen(true)}
                    disabled={!selectedEmployeeId || !selectedStoreId || isReadOnly}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-[26px] border-2 border-dashed border-sky-400 bg-sky-50/50 px-6 py-4 text-base font-semibold text-sky-700 transition-all duration-200 hover:border-sky-500 hover:bg-sky-100/50 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${isReadOnly ? 'opacity-50' : ''}`}
                  >
                    <PackageCheck className="h-5 w-5" />
                    เพิ่มรายการตั้งค่าสต็อก
                  </button>

                  {/* Cart Items Display */}
                  {adjustmentCart.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                          <ShoppingCart className="h-4 w-4" />
                          รายการในตะกร้า ({adjustmentCart.length})
                        </h3>
                        <button
                          type="button"
                          onClick={clearAdjustmentCart}
                          className="text-xs font-medium text-red-600 transition hover:text-red-700"
                        >
                          ล้างทั้งหมด
                        </button>
                      </div>

                      <div className="space-y-3">
                        {adjustmentCart.map((item, index) => (
                          <div
                            key={index}
                            className="group relative overflow-hidden rounded-2xl border border-sky-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md"
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-400">
                                <Package className="h-5 w-5 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-blue-900">
                                  {item.productCode} - {item.productName}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  <span className="font-medium text-sky-700">
                                    {item.quantity.toLocaleString("th-TH")}
                                  </span>{" "}
                                  {item.unitName}
                                </p>
                                {item.note && (
                                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                                    {item.note}
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFromAdjustmentCart(index)}
                                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 transition hover:bg-red-200 hover:text-red-700"
                                title="ลบรายการ"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Global Note for All Items */}
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm font-semibold text-blue-700" htmlFor="adjustment-global-note">
                          <Info className="h-4 w-4 text-blue-600" />
                          หมายเหตุสำหรับทั้งหมด (ไม่บังคับ)
                        </label>
                        <textarea
                          id="adjustment-global-note"
                          value={adjustmentGlobalNote}
                          onChange={(e) => setAdjustmentGlobalNote(e.target.value)}
                          className="form-input min-h-[80px] resize-y"
                          placeholder="ระบุหมายเหตุที่ใช้ร่วมกันสำหรับทุกรายการ..."
                        />
                      </div>

                      {/* Submit All Button */}
                      <form onSubmit={handleInitialSubmit}>
                        <button
                          type="submit"
                          disabled={submitState.status === "submitting" || isReadOnly}
                          className={`inline-flex w-full items-center justify-center gap-2 rounded-[26px] bg-gradient-to-r from-sky-600 via-blue-500 to-indigo-500 px-6 py-4 text-base font-semibold text-white shadow-[0_25px_80px_-50px_rgba(14,165,233,0.75)] transition-all duration-200 hover:shadow-[0_30px_90px_-55px_rgba(14,165,233,0.85)] focus:outline-none focus:ring-2 focus:ring-sky-200 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 ${isReadOnly ? 'opacity-50' : ''}`}
                        >
                          {submitState.status === "submitting" ? (
                            <>
                              <RefreshCw className="h-5 w-5 animate-spin" />
                              กำลังบันทึก...
                            </>
                          ) : (
                            <>
                              <Save className="h-5 w-5" />
                              บันทึกทั้งหมด ({adjustmentCart.length} รายการ)
                            </>
                          )}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Empty State */}
                  {adjustmentCart.length === 0 && (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-sky-200 bg-sky-50/30 px-6 py-12 text-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-400 shadow-lg">
                        <ShoppingCart className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-sm font-medium text-sky-700">
                        ยังไม่มีรายการในตะกร้า
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        กดปุ่ม &quot;เพิ่มรายการตั้งค่าสต็อก&quot; เพื่อเริ่มเพิ่มสินค้า
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Adjust Stock */}
              {/* Tab: Balance */}
              {activeTab === "balance" && (
                <div className="space-y-4">
                  {isLoadingInventory ? (
                    <div className="flex h-64 items-center justify-center text-slate-400">
                      <div className="flex items-center gap-3">
                        <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                        <span className="text-sm font-medium">กำลังโหลดข้อมูล...</span>
                      </div>
                    </div>
                  ) : inventory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 px-6 py-12 text-center">
                      <Package className="mb-3 h-12 w-12 text-blue-400" />
                      <p className="text-sm font-medium text-blue-700">
                        {selectedEmployeeId
                          ? "ยังไม่มีข้อมูลคงเหลือ"
                          : "กรุณาเลือกพนักงานเพื่อดูข้อมูลคงเหลือ"}
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Mobile: Card View */}
                      <div className="space-y-3 lg:hidden">
                        {inventory.map((item, idx) => {
                          const statusColor =
                            item.balance > 10
                              ? "bg-emerald-100 text-emerald-700"
                              : item.balance > 0
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700";
                          const StatusIcon =
                            item.balance > 10 ? CheckCircle2 : item.balance > 0 ? AlertTriangle : XCircle;

                          return (
                            <div
                              key={idx}
                              className="rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-sm transition hover:shadow-md"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex flex-1 items-start gap-3">
                                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100">
                                    <Package className="h-5 w-5 text-blue-600" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-semibold text-blue-900">
                                      {item.productCode} - {item.productName}
                                    </p>
                                    <p className="mt-0.5 text-sm text-slate-600">{item.unitName}</p>
                                    <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                                      <Clock className="h-3 w-3" />
                                      {new Date(item.updatedAt).toLocaleString("th-TH", {
                                        dateStyle: "short",
                                        timeStyle: "short",
                                      })}
                                    </div>
                                  </div>
                                </div>
                                <div className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 ${statusColor}`}>
                                  <StatusIcon className="h-4 w-4" />
                                  <span className="text-base font-bold">
                                    {item.balance.toLocaleString("th-TH")}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Desktop: Table View */}
                      <div className="hidden overflow-hidden rounded-2xl border border-blue-100 lg:block">
                        <table className="w-full min-w-[640px] text-left text-sm">
                          <thead className="bg-gradient-to-r from-blue-100 to-sky-50 text-xs uppercase tracking-wide text-blue-700">
                            <tr>
                              <th className="px-5 py-4 font-bold">สินค้า</th>
                              <th className="px-5 py-4 font-bold">หน่วย</th>
                              <th className="px-5 py-4 text-right font-bold">คงเหลือ</th>
                              <th className="px-5 py-4 font-bold">อัปเดตล่าสุด</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-blue-100 bg-white">
                            {inventory.map((item, idx) => {
                              const statusColor =
                                item.balance > 10
                                  ? "bg-emerald-100 text-emerald-700"
                                  : item.balance > 0
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-red-100 text-red-700";
                              const StatusIcon =
                                item.balance > 10 ? CheckCircle2 : item.balance > 0 ? AlertTriangle : XCircle;

                              return (
                                <tr key={idx} className="transition hover:bg-blue-50/30">
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
                                        <Package className="h-4 w-4 text-blue-600" />
                                      </div>
                                      <span className="font-medium text-blue-900">
                                        {item.productCode} - {item.productName}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-5 py-4 text-slate-700">{item.unitName}</td>
                                  <td className="px-5 py-4 text-right">
                                    <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold ${statusColor}`}>
                                      <StatusIcon className="h-4 w-4" />
                                      {item.balance.toLocaleString("th-TH")}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-1.5 text-slate-500">
                                      <Clock className="h-3.5 w-3.5" />
                                      <span>
                                        {new Date(item.updatedAt).toLocaleString("th-TH", {
                                          dateStyle: "short",
                                          timeStyle: "short",
                                        })}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar: GPS Status & Recent Transactions */}
            {activeTab !== "balance" && (
              <div className="space-y-6">
                {/* GPS Status Card */}
                <div className="rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-sm backdrop-blur-xl">
                  <div className="mb-3 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <h3 className="text-sm font-semibold text-blue-700">สถานะตำแหน่ง</h3>
                  </div>
                  {locationState.status === "resolved" ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-medium">ตรวจพบตำแหน่ง</span>
                      </div>
                      <p className="text-xs text-slate-600">{locationSummary}</p>
                    </div>
                  ) : locationState.status === "locating" ? (
                    <div className="flex items-center gap-2 text-xs text-blue-600">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>กำลังตรวจจับ...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-red-600">
                      <XCircle className="h-4 w-4" />
                      <span>ไม่พบตำแหน่ง</span>
                    </div>
                  )}
                </div>

                {/* Recent Transactions */}
                {recentTransactions.length > 0 && (
                  <div className="rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-sm backdrop-blur-xl">
                    <div className="mb-3 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <h3 className="text-sm font-semibold text-blue-700">รายการล่าสุด</h3>
                    </div>
                    <div className="space-y-2">
                      {recentTransactions.slice(0, 5).map((txn) => {
                        const IconComponent = transactionIcons[txn.transactionType] ?? transactionIcons.receive;
                        const gradientColor = transactionColors[txn.transactionType] ?? transactionColors.receive;

                        return (
                          <div
                            key={txn.id}
                            className="group flex items-start gap-2 rounded-xl border border-blue-100 bg-white p-3 text-xs transition hover:shadow-sm"
                          >
                            <div
                              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradientColor}`}
                            >
                              <div className="flex h-6 w-6 items-center justify-center text-white">
                                {IconComponent}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-blue-900 truncate">
                                {txn.productName}
                              </p>
                              <p className="text-xs text-slate-600">
                                <span className="font-medium">
                                  {txn.quantity.toLocaleString("th-TH")} {txn.unitName}
                                </span>
                              </p>
                              {txn.note && (
                                <p className="mt-0.5 text-xs text-slate-500 truncate">{txn.note}</p>
                              )}
                              <time className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                                <Calendar className="h-3 w-3" />
                                {new Date(txn.createdAt).toLocaleDateString("th-TH", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </time>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Receive Modal */}
      {isReceiveModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setIsReceiveModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-auto rounded-3xl border border-blue-100 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-blue-100 bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <PackagePlus className="h-6 w-6" />
                เพิ่มรายการรับเข้า
              </h2>
              <button
                type="button"
                onClick={() => setIsReceiveModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white transition hover:bg-white/30"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-6 p-6">
              {/* Product Selection Form */}
              <div className="space-y-4">
                {/* Product Selection */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-blue-700" htmlFor="modal-product">
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
                      id="modal-product"
                      value={receiveProductId}
                      onChange={(e) => {
                        setReceiveProductId(e.target.value);
                        setReceiveUnitQuantities({});
                      }}
                      className="form-input"
                      disabled={!selectedEmployeeId}
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

                {/* Units with Quantities */}
                {selectedReceiveProduct && selectedReceiveProduct.units.length > 0 && (
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                      <Layers className="h-4 w-4 text-blue-600" />
                      จำนวนแต่ละหน่วย (กรอกเฉพาะหน่วยที่ต้องการรับเข้า)
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedReceiveProduct.units.map((unit) => (
                        <div key={unit.unitId} className="space-y-1.5">
                          <label
                            className="block text-xs font-medium text-slate-700"
                            htmlFor={`unit-${unit.unitId}`}
                          >
                            {unit.unitName}
                          </label>
                          <input
                            id={`unit-${unit.unitId}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={receiveUnitQuantities[unit.unitId] || ""}
                            onChange={(e) =>
                              setReceiveUnitQuantities((prev) => ({
                                ...prev,
                                [unit.unitId]: e.target.value,
                              }))
                            }
                            className="form-input"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-blue-700" htmlFor="modal-note">
                    <Info className="h-4 w-4 text-blue-600" />
                    หมายเหตุ (ไม่บังคับ)
                  </label>
                  <textarea
                    id="modal-note"
                    value={receiveNote}
                    onChange={(e) => setReceiveNote(e.target.value)}
                    className="form-input min-h-[80px] resize-y"
                    placeholder="ระบุรายละเอียดเพิ่มเติมสำหรับรายการนี้..."
                  />
                </div>

                <button
                  type="button"
                  onClick={addToCart}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-500 px-5 py-3 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-1"
                >
                  <PackagePlus className="h-5 w-5" />
                  เพิ่มในตะกร้า
                </button>
              </div>

              {/* Cart Preview in Modal */}
              {receiveCart.length > 0 && (
                <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/30 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                      <ShoppingCart className="h-4 w-4" />
                      รายการในตะกร้า ({receiveCart.length})
                    </h3>
                  </div>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {receiveCart.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 rounded-xl border border-blue-200 bg-white p-3 text-xs"
                      >
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-sky-400">
                          <Package className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-blue-900 text-sm">
                            {item.productCode} - {item.productName}
                          </p>
                          <p className="text-xs text-slate-600">
                            <span className="font-medium text-blue-700">
                              {item.quantity.toLocaleString("th-TH")}
                            </span>{" "}
                            {item.unitName}
                          </p>
                          {item.note && (
                            <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                              {item.note}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(index)}
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 transition hover:bg-red-200"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 border-t border-blue-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setIsReceiveModalOpen(false)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-white px-5 py-3 text-base font-semibold text-blue-700 transition-all duration-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-1"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {isReturnModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setIsReturnModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-auto rounded-3xl border border-indigo-100 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-indigo-100 bg-gradient-to-r from-indigo-600 via-purple-500 to-blue-500 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <PackageMinus className="h-6 w-6" />
                เพิ่มรายการคืนสินค้า
              </h2>
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white transition hover:bg-white/30"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-6 p-6">
              {/* Product Selection Form */}
              <div className="space-y-4">
                {/* Product Selection */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-blue-700" htmlFor="return-modal-product">
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
                      id="return-modal-product"
                      value={returnProductId}
                      onChange={(e) => {
                        setReturnProductId(e.target.value);
                        setReturnUnitQuantities({});
                      }}
                      className="form-input"
                      disabled={!selectedEmployeeId}
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

                {/* Units with Quantities and Balance Display */}
                {selectedReturnProduct && selectedReturnProduct.units.length > 0 && (
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                      <Layers className="h-4 w-4 text-blue-600" />
                      จำนวนคืนแต่ละหน่วย (กรอกเฉพาะหน่วยที่ต้องการคืน)
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedReturnProduct.units.map((unit) => {
                        const balance = inventory.find(
                          (item) => item.productId === returnProductId && item.unitId === unit.unitId
                        );
                        const hasStock = balance && balance.balance > 0;

                        return (
                          <div key={unit.unitId} className="space-y-1.5">
                            <label
                              className="flex items-center justify-between text-xs font-medium text-slate-700"
                              htmlFor={`return-modal-unit-${unit.unitId}`}
                            >
                              <span>{unit.unitName}</span>
                              {hasStock ? (
                                <span className="text-xs text-blue-600">
                                  คงเหลือ: {balance.balance.toLocaleString("th-TH")}
                                </span>
                              ) : (
                                <span className="text-xs text-red-500">
                                  ไม่มีสต็อก
                                </span>
                              )}
                            </label>
                            <input
                              id={`return-modal-unit-${unit.unitId}`}
                              type="number"
                              min="0.01"
                              step="0.01"
                              max={balance?.balance ?? undefined}
                              value={returnUnitQuantities[unit.unitId] || ""}
                              onChange={(e) =>
                                setReturnUnitQuantities((prev) => ({
                                  ...prev,
                                  [unit.unitId]: e.target.value,
                                }))
                              }
                              className="form-input"
                              placeholder="0"
                              disabled={!hasStock}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-blue-700" htmlFor="return-modal-note">
                    <Info className="h-4 w-4 text-blue-600" />
                    หมายเหตุ (ไม่บังคับ)
                  </label>
                  <textarea
                    id="return-modal-note"
                    value={returnNote}
                    onChange={(e) => setReturnNote(e.target.value)}
                    className="form-input min-h-[80px] resize-y"
                    placeholder="ระบุรายละเอียดเพิ่มเติมสำหรับรายการนี้..."
                  />
                </div>

                <button
                  type="button"
                  onClick={addToReturnCart}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-500 to-blue-500 px-5 py-3 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-1"
                >
                  <PackageMinus className="h-5 w-5" />
                  เพิ่มในตะกร้า
                </button>
              </div>

              {/* Cart Preview in Modal */}
              {returnCart.length > 0 && (
                <div className="space-y-3 rounded-2xl border border-indigo-200 bg-indigo-50/30 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-indigo-700">
                      <ShoppingCart className="h-4 w-4" />
                      รายการในตะกร้า ({returnCart.length})
                    </h3>
                  </div>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {returnCart.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-white p-3 text-xs"
                      >
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-400">
                          <Package className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-blue-900 text-sm">
                            {item.productCode} - {item.productName}
                          </p>
                          <p className="text-xs text-slate-600">
                            <span className="font-medium text-indigo-700">
                              {item.quantity.toLocaleString("th-TH")}
                            </span>{" "}
                            {item.unitName}
                          </p>
                          {item.note && (
                            <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                              {item.note}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromReturnCart(index)}
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 transition hover:bg-red-200"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 border-t border-indigo-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-white px-5 py-3 text-base font-semibold text-indigo-700 transition-all duration-200 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-1"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Initial/Adjustment Modal */}
      {isInitialModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setIsInitialModalOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-auto rounded-3xl border border-sky-100 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-sky-100 bg-gradient-to-r from-sky-600 via-blue-500 to-indigo-500 px-6 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                <PackageCheck className="h-6 w-6" />
                เพิ่มรายการตั้งค่าสต็อก
              </h2>
              <button
                type="button"
                onClick={() => setIsInitialModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white transition hover:bg-white/30"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-6 p-6">
              {/* Info Banner */}
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-700">
                    ใช้สำหรับกรอกจำนวนสินค้าที่มีอยู่เดิม เมื่อเริ่มใช้ระบบครั้งแรก
                  </p>
                </div>
              </div>

              {/* Product Selection Form */}
              <div className="space-y-4">
                {/* Product Selection */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-blue-700" htmlFor="initial-modal-product">
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
                      id="initial-modal-product"
                      value={initialProductId}
                      onChange={(e) => {
                        setInitialProductId(e.target.value);
                        setInitialUnitQuantities({});
                      }}
                      className="form-input"
                      disabled={!selectedEmployeeId}
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

                {/* Units with Quantities */}
                {selectedInitialProduct && selectedInitialProduct.units.length > 0 && (
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-blue-700">
                      <Layers className="h-4 w-4 text-blue-600" />
                      จำนวนเริ่มต้นแต่ละหน่วย (กรอกเฉพาะหน่วยที่ต้องการตั้งค่า)
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedInitialProduct.units.map((unit) => (
                        <div key={unit.unitId} className="space-y-1.5">
                          <label
                            className="block text-xs font-medium text-slate-700"
                            htmlFor={`initial-modal-unit-${unit.unitId}`}
                          >
                            {unit.unitName}
                          </label>
                          <input
                            id={`initial-modal-unit-${unit.unitId}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={initialUnitQuantities[unit.unitId] || ""}
                            onChange={(e) =>
                              setInitialUnitQuantities((prev) => ({
                                ...prev,
                                [unit.unitId]: e.target.value,
                              }))
                            }
                            className="form-input"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-semibold text-blue-700" htmlFor="initial-modal-note">
                    <Info className="h-4 w-4 text-blue-600" />
                    หมายเหตุ (ไม่บังคับ)
                  </label>
                  <textarea
                    id="initial-modal-note"
                    value={initialNote}
                    onChange={(e) => setInitialNote(e.target.value)}
                    className="form-input min-h-[80px] resize-y"
                    placeholder="ระบุรายละเอียดเพิ่มเติมสำหรับรายการนี้..."
                  />
                </div>

                <button
                  type="button"
                  onClick={addToAdjustmentCart}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-sky-600 via-blue-500 to-indigo-500 px-5 py-3 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-sky-200 focus:ring-offset-1"
                >
                  <PackageCheck className="h-5 w-5" />
                  เพิ่มในตะกร้า
                </button>
              </div>

              {/* Cart Preview in Modal */}
              {adjustmentCart.length > 0 && (
                <div className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50/30 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-sky-700">
                      <ShoppingCart className="h-4 w-4" />
                      รายการในตะกร้า ({adjustmentCart.length})
                    </h3>
                  </div>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {adjustmentCart.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 rounded-xl border border-sky-200 bg-white p-3 text-xs"
                      >
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-400">
                          <Package className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-blue-900 text-sm">
                            {item.productCode} - {item.productName}
                          </p>
                          <p className="text-xs text-slate-600">
                            <span className="font-medium text-sky-700">
                              {item.quantity.toLocaleString("th-TH")}
                            </span>{" "}
                            {item.unitName}
                          </p>
                          {item.note && (
                            <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                              {item.note}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromAdjustmentCart(index)}
                          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600 transition hover:bg-red-200"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 border-t border-sky-100 bg-white px-6 py-4">
              <button
                type="button"
                onClick={() => setIsInitialModalOpen(false)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-sky-200 bg-white px-5 py-3 text-base font-semibold text-sky-700 transition-all duration-200 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:ring-offset-1"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
