import { Suspense } from "react";
import DashboardView from "@/components/dashboard/DashboardView";
export default function CarerDashboard() {
  return <Suspense fallback={null}><DashboardView role="carer" /></Suspense>;
}
