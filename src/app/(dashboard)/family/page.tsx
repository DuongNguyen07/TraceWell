import { Suspense } from "react";
import DashboardView from "@/components/dashboard/DashboardView";
export default function FamilyDashboard() {
  return <Suspense fallback={null}><DashboardView role="family" /></Suspense>;
}
