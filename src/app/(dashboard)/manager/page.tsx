import { Suspense } from "react";
import DashboardView from "@/components/dashboard/DashboardView";
export default function ManagerDashboard() {
  return <Suspense fallback={null}><DashboardView role="manager" /></Suspense>;
}
