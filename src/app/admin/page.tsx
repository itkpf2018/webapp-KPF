import {
  getDashboardSnapshot,
  getDashboardMetrics,
  getEmployees,
  getStores,
} from "@/lib/configStore";
import EnterpriseDashboardClient from "./EnterpriseDashboardClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [snapshot, metrics, employees, stores] = await Promise.all([
    getDashboardSnapshot(),
    getDashboardMetrics(),
    getEmployees(),
    getStores(),
  ]);

  const simplifiedEmployees = employees.map((employee) => ({
    id: employee.id,
    name: employee.name,
    province: employee.province ?? null,
  }));

  const simplifiedStores = stores.map((store) => ({
    id: store.id,
    name: store.name,
    province: store.province ?? null,
  }));

  return (
    <EnterpriseDashboardClient
      snapshot={snapshot}
      initialMetrics={metrics}
      employees={simplifiedEmployees}
      stores={simplifiedStores}
    />
  );
}
