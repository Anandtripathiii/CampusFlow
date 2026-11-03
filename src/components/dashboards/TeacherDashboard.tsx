"use client";
import Dashboard, { type DashboardInitial } from "@/app/dashboard/Dashboard";

export default function TeacherDashboard({ initial }: { initial: DashboardInitial }) {
  return <Dashboard initial={initial} />;
}
