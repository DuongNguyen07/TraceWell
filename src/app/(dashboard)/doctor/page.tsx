import { Suspense } from "react";
import DashboardView from "@/components/dashboard/DashboardView";
export default function DoctorDashboard() {
  return <Suspense fallback={null}><DashboardView role="doctor" /></Suspense>;
}
