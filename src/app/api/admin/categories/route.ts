import { NextResponse } from "next/server";
import { createCategory, getCategories } from "@/lib/configStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const categories = await getCategories();
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  try {
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
    const category = await createCategory({ name, color: color || "#3b82f6" });
    return NextResponse.json({ ok: true, category });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ไม่สามารถเพิ่มหมวดหมู่ได้";
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }
}
