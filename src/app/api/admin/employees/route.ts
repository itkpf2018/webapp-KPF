import { NextResponse } from "next/server";
import { createEmployee, getEmployees } from "@/lib/configStore";
import { getEmployeeStoreAssignments } from "@/lib/supabaseEmployeeStores";

export async function GET() {
  const employees = await getEmployees();

  // Fetch store assignments for each employee
  const employeesWithStores = await Promise.all(
    employees.map(async (employee) => {
      const assignments = await getEmployeeStoreAssignments(employee.id);
      return {
        ...employee,
        storeIds: assignments.map(a => a.storeId),
      };
    })
  );

  return NextResponse.json({ employees: employeesWithStores });
}

export async function POST(request: Request) {
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
    const employee = await createEmployee({
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
      error instanceof Error ? error.message : "ไม่สามารถเพิ่มพนักงานได้";
    const isClientError = message.includes("กรุณา") || message.includes("มีชื่อ") || message.includes("รหัสพนักงาน");
    return NextResponse.json(
      { ok: false, message },
      { status: isClientError ? 400 : 500 },
    );
  }
}
