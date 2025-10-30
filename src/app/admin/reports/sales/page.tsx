import { Suspense } from "react";
import SalesReportPageClient from "./SalesReportPageClient";
import { ReportTabs } from "../_components/ReportTabs";
import { getEmployees, getStores } from "@/lib/configStore";

export default async function SalesReportsPage() {
  const [employees, stores] = await Promise.all([getEmployees(), getStores()]);

  const clientEmployees = employees.map((employee) => ({
    id: employee.id,
    name: employee.name,
    phone: employee.phone ?? null,
    province: employee.province ?? null,
    region: employee.region ?? null,
    regularDayOff: employee.regularDayOff ?? null,
    defaultStoreId: employee.defaultStoreId ?? null,
  }));

  const clientStores = stores.map((store) => ({
    id: store.id,
    name: store.name,
    province: store.province ?? null,
  }));

  return (
    <div className="space-y-6">
      <ReportTabs />
      <Suspense fallback={<div className="p-8 text-center text-gray-500">กำลังโหลด...</div>}>
        <SalesReportPageClient initialEmployees={clientEmployees} initialStores={clientStores} />
      </Suspense>
    </div>
  );
}
