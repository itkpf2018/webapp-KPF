import { NextResponse } from "next/server";
import { createLeave, getLeaves } from "@/lib/configStore";
import type { LeaveRecord } from "@/lib/configStore";

const isLeaveStatus = (value: unknown): value is LeaveRecord["status"] =>
  typeof value === "string" &&
  (value === "scheduled" || value === "approved" || value === "rejected" || value === "cancelled");

export async function GET() {
  const leaves = await getLeaves();
  return NextResponse.json({ leaves });
}

export async function POST(request: Request) {
  try {
    const {
      employeeId,
      type,
      startDate,
      endDate,
      reason,
      note,
      status,
    } = (await request.json()) as {
      employeeId?: string;
      type?: string;
      startDate?: string;
      endDate?: string;
      reason?: string;
      note?: string;
      status?: string;
    };
    if (!employeeId || !type || !startDate || !endDate) {
      return NextResponse.json(
        { ok: false, message: "กรุณากรอกข้อมูลวันลาให้ครบถ้วน" },
        { status: 400 },
      );
    }
    const leave = await createLeave({
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
      error instanceof Error ? error.message : "ไม่สามารถบันทึกวันลาได้";
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
