import { z } from "zod";

export const PRIORITIES = ["low", "medium", "high"] as const;
export const ROLES = ["student", "teacher", "professional"] as const;
export const COLORS = ["indigo", "mint", "peach", "coral", "lavender", "blue", "yellow", "green", "pink", "teal", "orange", "purple", "red", "gray"] as const;

export const SemesterInput = z.object({
  name: z.string().trim().min(1).max(80),
});

export const SubjectInput = z.object({
  name: z.string().trim().min(1).max(80),
  color: z.enum(COLORS).default("indigo"),
  semester_id: z.string().uuid().nullable().optional(),
});

export const TaskInput = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().max(2000).default(""),
  priority: z.enum(PRIORITIES).default("medium"),
  tag: z.string().max(40).default(""),
  due_at: z.string().datetime().nullable().optional(),
  subject_id: z.string().uuid().nullable().optional(),
  semester_id: z.string().uuid().nullable().optional(),
  reminder_day_before: z.boolean().optional(),
  reminder_hour_before: z.boolean().optional(),
  reminder_at_time: z.boolean().optional(),
});

export const TaskPatch = TaskInput.partial().extend({
  completed: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export const ProfilePatch = z.object({
  role: z.enum(ROLES).optional(),
  display_name: z.string().max(80).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  pomodoro_work_minutes: z.number().int().min(1).max(180).optional(),
  pomodoro_break_minutes: z.number().int().min(1).max(60).optional(),
  reminder_default_day_before: z.boolean().optional(),
  reminder_default_hour_before: z.boolean().optional(),
  reminder_default_at_time: z.boolean().optional(),
  current_semester_id: z.string().uuid().nullable().optional(),
});

export const TimerSessionInput = z.object({
  task_id: z.string().uuid().nullable().optional(),
  mode: z.enum(["work", "break"]),
  started_at: z.string().datetime(),
  ended_at: z.string().datetime(),
  seconds: z.number().int().min(0).max(60 * 60 * 24),
});
