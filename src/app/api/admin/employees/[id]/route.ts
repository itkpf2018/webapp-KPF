import { NextResponse } from "next/server";
import { deleteEmployee, updateEmployee } from "@/lib/configStore";

type ParamsPromise = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: ParamsPromise) {
  try {
    const {
      name,
      employeeCode,
      phone,
      regularDayOff,
      province,
      region,
      defaultStoreId,
    } = (await request.json()) as {
      name?: string;
      employeeCode?: string;
      phone?: string;
      regularDayOff?: string;
      province?: string;
      region?: string;
      defaultStoreId?: string | null;
    };
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { ok: false, message: "กรุณาระบุชื่อพนักงาน" },
        { status: 400 },
      );
    }
    const { id } = await context.params;
    const employee = await updateEmployee(id, {
      name,
      employeeCode,
      phone,
      regularDayOff,
      province,
      region,
      defaultStoreId,
    });
    return NextResponse.json({ ok: true, employee });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ไม่สามารถแก้ไขพนักงานได้";
    const isClientError =
      message.includes("กรุณา") || message.includes("ไม่พบ") || message.includes("มีชื่อ") || message.includes("รหัสพนักงาน");
    return NextResponse.json(
      { ok: false, message },
      { status: isClientError ? 400 : 500 },
    );
  }
}

export async function DELETE(request: Request, context: ParamsPromise) {
  try {
    const { id } = await context.params;
    await deleteEmployee(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ไม่สามารถลบพนักงานได้";
    const isClientError = message.includes("ไม่พบ");
    return NextResponse.json(
      { ok: false, message },
      { status: isClientError ? 404 : 500 },
    );
  }
}
