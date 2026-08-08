import { Suspense } from "react";
import DashboardView from "@/components/dashboard/DashboardView";
export default function PatientDashboard() {
  return <Suspense fallback={null}><DashboardView role="patient" /></Suspense>;
}
