import { NextResponse } from "next/server";
import { deleteLeave, updateLeave } from "@/lib/configStore";
import type { LeaveRecord } from "@/lib/configStore";

type ParamsPromise = {
  params: Promise<{ id: string }>;
};

const isLeaveStatus = (value: unknown): value is LeaveRecord["status"] =>
  typeof value === "string" &&
  (value === "scheduled" || value === "approved" || value === "rejected" || value === "cancelled");

export async function PUT(request: Request, context: ParamsPromise) {
  try {
    const {
      employeeId,
      type,
      startDate,
      endDate,
      reason,
      note,
      status,
    } = (await request.json()) as Partial<{
      employeeId: string;
      type: string;
      startDate: string;
      endDate: string;
      reason: string;
      note: string;
      status: string;
    }>;
    const { id } = await context.params;
    const leave = await updateLeave(id, {
      employeeId,
      type,
      startDate,
      endDate,
      reason,
      note,
      status: isLeaveStatus(status) ? status : undefined,
    });
    return NextResponse.json({ ok: true, leave });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ไม่สามารถแก้ไขวันลาได้";
    const isClientError =
      message.includes("กรุณา") ||
      message.includes("ไม่พบ") ||
      message.includes("ไม่ถูกต้อง") ||
      message.includes("วันเริ่มต้น");
    return NextResponse.json(
      { ok: false, message },
      { status: isClientError ? 400 : 500 },
    );
  }
}

export async function DELETE(request: Request, context: ParamsPromise) {
  try {
    const { id } = await context.params;
    await deleteLeave(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ไม่สามารถลบวันลาได้";
    const isClientError = message.includes("ไม่พบ");
    return NextResponse.json(
      { ok: false, message },
      { status: isClientError ? 404 : 500 },
    );
  }
}
