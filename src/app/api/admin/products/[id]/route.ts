import { NextResponse } from "next/server";
import { deleteProduct, updateProduct } from "@/lib/configStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ParamsPromise = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: ParamsPromise) {
  try {
    const body = (await request.json()) as {
      code?: string;
      name?: string;
      unitPrice?: number;
      categoryId?: string | null;
      sku?: string | null;
      description?: string | null;
      imageUrl?: string | null;
      isActive?: boolean;
    };

    if (!body.code || !body.name || typeof body.unitPrice !== "number") {
      return NextResponse.json(
        { ok: false, message: "ข้อมูลสินค้าไม่ครบถ้วน" },
        { status: 400 },
      );
    }

    const { id } = await context.params;
    const product = await updateProduct(id, {
      code: body.code,
      name: body.name,
      unitPrice: body.unitPrice,
      categoryId: body.categoryId,
      sku: body.sku,
      description: body.description,
      imageUrl: body.imageUrl,
      isActive: body.isActive,
    });

    return NextResponse.json({ ok: true, product });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ไม่สามารถแก้ไขสินค้าได้";
    const isClientError =
      message.includes("กรุณา") ||
      message.includes("ไม่พบ") ||
      message.includes("รหัสสินค้า") ||
      message.includes("ชื่อสินค้า") ||
      message.includes("ราคา") ||
      message.includes("หมวดหมู่");
    return NextResponse.json(
        { ok: false, message },
        { status: isClientError ? 400 : 500 },
      );
    }
}

export async function DELETE(request: Request, context: ParamsPromise) {
  try {
    const { id } = await context.params;
    await deleteProduct(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ไม่สามารถลบสินค้าได้";
    const isClientError = message.includes("ไม่พบ");
    return NextResponse.json(
      { ok: false, message },
      { status: isClientError ? 404 : 500 },
    );
  }
}
