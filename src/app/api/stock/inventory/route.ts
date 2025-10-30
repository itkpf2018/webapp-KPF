import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabaseClient";
import { withTelemetrySpan } from "@/lib/observability";
import type { Database } from "@/types/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ========================
// Type Definitions
// ========================

interface InventoryItem {
  productId: string;
  productCode: string;
  productName: string;
  unitId: string;
  unitName: string;
  balance: number;
  updatedAt: string;
}

interface GetInventoryResponse {
  success: true;
  inventory: InventoryItem[];
}

interface UpdateInventoryRequest {
  employee_id: string;
  store_id: string;
  product_id: string;
  unit_id: string;
  quantity: number;
}

interface UpdateInventoryResponse {
  success: true;
  message: string;
  inventory_id: string;
  quantity: number;
}

interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
}

// ========================
// Helper Functions
// ========================

/**
 * Validate UUID format
 */
function isValidUUID(value: string): boolean {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidPattern.test(value);
}

/**
 * Validate required query parameters
 */
function validateRequiredParams(
  params: Record<string, string | null>,
  requiredKeys: string[]
): { valid: true } | { valid: false; error: string } {
  for (const key of requiredKeys) {
    const value = params[key];
    if (!value || !value.trim()) {
      return { valid: false, error: `กรุณาระบุ ${key}` };
    }
    if (!isValidUUID(value.trim())) {
      return { valid: false, error: `${key} ไม่ถูกต้อง` };
    }
  }
  return { valid: true };
}

// ========================
// GET - Fetch Inventory
// ========================

export async function GET(request: NextRequest) {
  return withTelemetrySpan<NextResponse>(
    "stock.inventory.get",
    async (span) => {
      try {
        const { searchParams } = new URL(request.url);
        // Support both camelCase and snake_case parameter names
        const employee_id = searchParams.get("employee_id") || searchParams.get("employeeId");
        const store_id = searchParams.get("store_id") || searchParams.get("storeId");
        const product_id = searchParams.get("product_id") || searchParams.get("productId");

        // Validate required parameters
        if (!employee_id || !employee_id.trim()) {
          return NextResponse.json<ErrorResponse>(
            { success: false, error: "กรุณาระบุ employee_id หรือ employeeId" },
            { status: 400 }
          );
        }

        if (!store_id || !store_id.trim()) {
          return NextResponse.json<ErrorResponse>(
            { success: false, error: "กรุณาระบุ store_id หรือ storeId" },
            { status: 400 }
          );
        }

        if (!isValidUUID(employee_id.trim())) {
          return NextResponse.json<ErrorResponse>(
            { success: false, error: "employee_id ไม่ถูกต้อง" },
            { status: 400 }
          );
        }

        if (!isValidUUID(store_id.trim())) {
          return NextResponse.json<ErrorResponse>(
            { success: false, error: "store_id ไม่ถูกต้อง" },
            { status: 400 }
          );
        }

        span.setAttribute("employee_id", employee_id.trim());
        span.setAttribute("store_id", store_id.trim());
        span.setAttribute("product_id", product_id || "");

        const supabase = getSupabaseServiceClient();

        // Verify employee exists
        const { data: employee, error: employeeError } = await supabase
          .from("employees")
          .select("id, name")
          .eq("id", employee_id!.trim())
          .single();

        if (employeeError || !employee) {
          span.markError(employeeError || new Error("Employee not found"));
          return NextResponse.json<ErrorResponse>(
            { success: false, error: "ไม่พบข้อมูลพนักงาน" },
            { status: 404 }
          );
        }

        // Verify store exists
        const { data: store, error: storeError } = await supabase
          .from("stores")
          .select("id, name")
          .eq("id", store_id!.trim())
          .single();

        if (storeError || !store) {
          span.markError(storeError || new Error("Store not found"));
          return NextResponse.json<ErrorResponse>(
            { success: false, error: "ไม่พบข้อมูลร้าน" },
            { status: 404 }
          );
        }

        // Build inventory query
        let query = supabase
          .from("stock_inventory")
          .select(
            `
            id,
            product_id,
            unit_id,
            quantity,
            updated_at,
            products!inner (
              code,
              name
            ),
            product_units!inner (
              name
            )
          `
          )
          .eq("employee_id", employee_id!.trim())
          .eq("store_id", store_id!.trim())
          .gt("quantity", 0) // Only show items with stock
          .order("updated_at", { ascending: false });

        // Filter by product if specified
        if (product_id && product_id.trim() && isValidUUID(product_id.trim())) {
          query = query.eq("product_id", product_id.trim());
          span.setAttribute("filter_by_product", true);
        }

        const { data: inventoryRows, error: inventoryError } = await query;

        if (inventoryError) {
          console.error("[stock.inventory.get] Query error:", inventoryError);
          span.markError(inventoryError);
          return NextResponse.json<ErrorResponse>(
            { success: false, error: "ไม่สามารถดึงข้อมูลสต็อกได้" },
            { status: 500 }
          );
        }

        // Transform data to camelCase for consistency with frontend
        const inventory: InventoryItem[] = (inventoryRows || []).map((row) => {
          const typedRow = row as {
            id: string;
            product_id: string;
            unit_id: string;
            quantity: number;
            updated_at: string;
            products: { code: string; name: string };
            product_units: { name: string };
          };

          return {
            productId: typedRow.product_id,
            productCode: typedRow.products.code,
            productName: typedRow.products.name,
            unitId: typedRow.unit_id,
            unitName: typedRow.product_units.name,
            balance: typedRow.quantity,
            updatedAt: typedRow.updated_at,
          };
        });

        span.setAttribute("inventory_count", inventory.length);

        return NextResponse.json<GetInventoryResponse>({
          success: true,
          inventory,
        });
      } catch (error) {
        console.error("[stock.inventory.get] Unexpected error:", error);
        span.markError(error);

        const message =
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาดในการดึงข้อมูลสต็อก";

        return NextResponse.json<ErrorResponse>(
          { success: false, error: message },
          { status: 500 }
        );
      }
    }
  );
}

// ========================
// POST - Update Inventory (Admin Only)
// ========================

export async function POST(request: NextRequest) {
  return withTelemetrySpan<NextResponse>(
    "stock.inventory.update",
    async (span) => {
      try {
        const body = (await request.json()) as Partial<UpdateInventoryRequest>;

        // Validate required fields
        const { employee_id, store_id, product_id, unit_id, quantity } = body;

        if (!employee_id || !employee_id.trim()) {
          return NextResponse.json<ErrorResponse>(
            { success: false, error: "กรุณาระบุ employee_id" },
            { status: 400 }
          );
        }

        if (!store_id || !store_id.trim()) {
          return NextResponse.json<ErrorResponse>(
            { success: false, error: "กรุณาระบุ store_id" },
            { status: 400 }
          );
        }

        if (!product_id || !product_id.trim()) {
          return NextResponse.json<ErrorResponse>(
            { success: false, error: "กรุณาระบุ product_id" },
            { status: 400 }
          );
        }

        if (!unit_id || !unit_id.trim()) {
          return NextResponse.json<ErrorResponse>(
            { success: false, error: "กรุณาระบุ unit_id" },
            { status: 400 }
          );
        }

        if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity < 0) {
          return NextResponse.json<ErrorResponse>(
            { success: false, error: "จำนวนสต็อกไม่ถูกต้อง" },
            { status: 400 }
          );
        }

        // Validate UUID formats
        if (!isValidUUID(employee_id.trim())) {
          return NextResponse.json<ErrorResponse>(
            { success: false, error: "employee_id ไม่ถูกต้อง" },
            { status: 400 }
          );
        }

        if (!isValidUUID(store_id.trim())) {
          return NextResponse.json<ErrorResponse>(
            { success: false, error: "store_id ไม่ถูกต้อง" },
            { status: 400 }
          );
        }

        if (!isValidUUID(product_id.trim())) {
          return NextResponse.json<ErrorResponse>(
            { success: false, error: "product_id ไม่ถูกต้อง" },
            { status: 400 }
          );
        }

        if (!isValidUUID(unit_id.trim())) {
          return NextResponse.json<ErrorResponse>(
            { success: false, error: "unit_id ไม่ถูกต้อง" },
            { status: 400 }
          );
        }

        span.setAttribute("employee_id", employee_id.trim());
        span.setAttribute("store_id", store_id.trim());
        span.setAttribute("product_id", product_id.trim());
        span.setAttribute("unit_id", unit_id.trim());
        span.setAttribute("quantity", quantity);

        const supabase = getSupabaseServiceClient();

        // Verify employee exists
        const { data: employee, error: employeeError } = await supabase
          .from("employees")
          .select("id, name")
          .eq("id", employee_id.trim())
          .single();

        if (employeeError || !employee) {
          span.markError(employeeError || new Error("Employee not found"));
          return NextResponse.json<ErrorResponse>(
            { success: false, error: "ไม่พบข้อมูลพนักงาน" },
            { status: 404 }
          );
        }

        // Verify store exists
        const { data: store, error: storeError } = await supabase
          .from("stores")
          .select("id, name")
          .eq("id", store_id.trim())
          .single();

        if (storeError || !store) {
          span.markError(storeError || new Error("Store not found"));
          return NextResponse.json<ErrorResponse>(
            { success: false, error: "ไม่พบข้อมูลร้าน" },
            { status: 404 }
          );
        }

        // Verify product and unit exist
        const { data: productUnit, error: productUnitError } = await supabase
          .from("product_units")
          .select("id, product_id")
          .eq("id", unit_id.trim())
          .eq("product_id", product_id.trim())
          .single();

        if (productUnitError || !productUnit) {
          span.markError(productUnitError || new Error("Product unit not found"));
          return NextResponse.json<ErrorResponse>(
            { success: false, error: "ไม่พบข้อมูลสินค้าหรือหน่วย" },
            { status: 404 }
          );
        }

        // Check if inventory record exists
        const { data: existingInventory } = await supabase
          .from("stock_inventory")
          .select("id, quantity")
          .eq("employee_id", employee_id.trim())
          .eq("store_id", store_id.trim())
          .eq("product_id", product_id.trim())
          .eq("unit_id", unit_id.trim())
          .maybeSingle();

        let inventory_id: string;

        if (existingInventory) {
          // Update existing inventory
          const { error: updateError } = await supabase
            .from("stock_inventory")
            .update({ quantity, updated_at: new Date().toISOString() })
            .eq("id", existingInventory.id);

          if (updateError) {
            console.error("[stock.inventory.update] Update error:", updateError);
            span.markError(updateError);
            return NextResponse.json<ErrorResponse>(
              { success: false, error: "ไม่สามารถอัปเดตสต็อกได้" },
              { status: 500 }
            );
          }

          inventory_id = existingInventory.id;
        } else {
          // Insert new inventory record
          const insertData: Database["public"]["Tables"]["stock_inventory"]["Insert"] = {
            employee_id: employee_id.trim(),
            store_id: store_id.trim(),
            product_id: product_id.trim(),
            unit_id: unit_id.trim(),
            quantity,
          };

          const { data: newInventory, error: insertError } = await supabase
            .from("stock_inventory")
            .insert(insertData)
            .select("id")
            .single();

          if (insertError || !newInventory) {
            console.error("[stock.inventory.update] Insert error:", insertError);
            span.markError(insertError || new Error("Insert failed"));
            return NextResponse.json<ErrorResponse>(
              { success: false, error: "ไม่สามารถสร้างข้อมูลสต็อกได้" },
              { status: 500 }
            );
          }

          inventory_id = newInventory.id;
        }

        span.setAttribute("inventory_id", inventory_id);
        span.setAttribute("operation", existingInventory ? "update" : "insert");

        return NextResponse.json<UpdateInventoryResponse>(
          {
            success: true,
            message: "อัปเดตสต็อกสำเร็จ",
            inventory_id,
            quantity,
          },
          { status: 200 }
        );
      } catch (error) {
        console.error("[stock.inventory.update] Unexpected error:", error);
        span.markError(error);

        const message =
          error instanceof Error
            ? error.message
            : "เกิดข้อผิดพลาดในการอัปเดตสต็อก";

        return NextResponse.json<ErrorResponse>(
          { success: false, error: message },
          { status: 500 }
        );
      }
    }
  );
}
