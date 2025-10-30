import { Suspense } from "react";
import RoiReportPageClient from "./RoiReportPageClient";
import { ReportTabs } from "../_components/ReportTabs";
import { getEmployees } from "@/lib/configStore";

export default async function RoiReportsPage() {
  const employees = await getEmployees();

  const clientEmployees = employees.map((employee) => ({
    id: employee.id,
    name: employee.name,
    phone: employee.phone ?? null,
    province: employee.province ?? null,
    region: employee.region ?? null,
    defaultStoreId: employee.defaultStoreId ?? null,
  }));

  return (
    <div className="space-y-6 print:space-y-0">
      <ReportTabs />
      <Suspense fallback={<div className="p-8 text-center text-gray-500">กำลังโหลด...</div>}>
        <RoiReportPageClient initialEmployees={clientEmployees} />
      </Suspense>
    </div>
  );
}
