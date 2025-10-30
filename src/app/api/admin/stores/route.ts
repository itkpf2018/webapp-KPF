import { NextResponse } from "next/server";
import { createStore, getStores } from "@/lib/configStore";

export async function GET() {
  const stores = await getStores();
  return NextResponse.json({ stores });
}

export async function POST(request: Request) {
  try {
    const { name, province, address, latitude, longitude, radius } = (await request.json()) as {
      name?: string;
      province?: string | null;
      address?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      radius?: number | null;
    };
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { ok: false, message: "กรุณาระบุชื่อร้าน/หน่วยงาน" },
        { status: 400 },
      );
    }
    const store = await createStore({ name, province, address, latitude, longitude, radius });
    return NextResponse.json({ ok: true, store });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ไม่สามารถเพิ่มร้าน/หน่วยงานได้";
    const isClientError = message.includes("กรุณา") || message.includes("มีชื่อ");
    return NextResponse.json(
      { ok: false, message },
      { status: isClientError ? 400 : 500 },
    );
  }
}
