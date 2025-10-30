import { NextResponse } from "next/server";
import {
  deleteProductCatalogItem,
  listProductCatalog,
  upsertProductCatalogItem,
  type UpsertProductCatalogInput,
} from "@/lib/supabaseProducts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const products = await listProductCatalog();
  return NextResponse.json({ products });
}

function normalizeUnits(units: UpsertProductCatalogInput["units"]) {
  if (!Array.isArray(units) || units.length === 0) {
    throw new Error("กรุณาเพิ่มหน่วยสินค้าอย่างน้อย 1 หน่วย");
  }
  return units.map((unit) => {
    const multiplier = Number(unit.multiplierToBase);
    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      throw new Error("กรุณาระบุอัตราแปลงหน่วยเป็นตัวเลขที่มากกว่า 0");
    }
    return {
      id: unit.id,
      name: unit.name?.trim() ?? "",
      isBase: Boolean(unit.isBase),
      multiplierToBase: multiplier,
    };
  });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<UpsertProductCatalogInput>;
    if (!payload || !payload.code || !payload.name) {
      return NextResponse.json(
        { ok: false, message: "กรุณากรอกรหัสและชื่อสินค้าให้ครบถ้วน" },
        { status: 400 },
      );
    }

    const product = await upsertProductCatalogItem({
      id: payload.id,
      code: payload.code,
      name: payload.name,
      description: payload.description ?? null,
      isActive: payload.isActive ?? true,
      units: normalizeUnits(payload.units ?? []),
    });

    return NextResponse.json({ ok: true, product });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลสินค้าได้";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { id } = (await request.json()) as { id?: string };
    if (!id) {
      return NextResponse.json(
        { ok: false, message: "กรุณาระบุสินค้าเพื่อทำการลบ" },
        { status: 400 },
      );
    }
    await deleteProductCatalogItem(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ไม่สามารถลบสินค้าได้";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
