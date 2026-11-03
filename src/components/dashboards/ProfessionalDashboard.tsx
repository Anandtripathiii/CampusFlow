"use client";
import Dashboard, { type DashboardInitial } from "@/app/dashboard/Dashboard";

export default function ProfessionalDashboard({ initial }: { initial: DashboardInitial }) {
  return <Dashboard initial={initial} />;
}
