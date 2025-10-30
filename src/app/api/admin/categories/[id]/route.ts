import { NextResponse } from "next/server";
import { updateCategory, deleteCategory } from "@/lib/configStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { name, color } = (await request.json()) as {
      name?: string;
      color?: string;
    };
    if (!name) {
      return NextResponse.json(
        { ok: false, message: "กรุณาระบุชื่อหมวดหมู่" },
        { status: 400 },
      );
    }
    const category = await updateCategory(id, { name, color: color || "#3b82f6" });
    return NextResponse.json({ ok: true, category });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ไม่สามารถแก้ไขหมวดหมู่ได้";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteCategory(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ไม่สามารถลบหมวดหมู่ได้";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
