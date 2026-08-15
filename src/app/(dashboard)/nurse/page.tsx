import { Suspense } from "react";
import DashboardView from "@/components/dashboard/DashboardView";
export default function NurseDashboard() {
  return <Suspense fallback={null}><DashboardView role="nurse" /></Suspense>;
}
