"use client";
import Dashboard, { type DashboardInitial } from "@/app/dashboard/Dashboard";

// Role-specific divergence lives here. The shared layout, sidebar and
// task/subject CRUD are in Dashboard.tsx and reused as-is until the
// student view genuinely needs its own sections (timetable, exams, etc).
export default function StudentDashboard({ initial }: { initial: DashboardInitial }) {
  return <Dashboard initial={initial} />;
}
