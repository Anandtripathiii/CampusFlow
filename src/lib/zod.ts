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
  onboarding_completed: z.boolean().optional(),
  institution: z.string().max(120).optional(),
  course_or_department: z.string().max(120).optional(),
  current_year: z.string().max(40).optional(),
  company: z.string().max(120).optional(),
  job_title: z.string().max(120).optional(),
  team: z.string().max(120).optional(),
  goals: z.array(z.string().max(60)).max(20).optional(),
});

export const TimerSessionInput = z.object({
  task_id: z.string().uuid().nullable().optional(),
  mode: z.enum(["work", "break"]),
  started_at: z.string().datetime(),
  ended_at: z.string().datetime(),
  seconds: z.number().int().min(0).max(60 * 60 * 24),
});

const uuidish = z.string().uuid().nullable().optional();
const name160  = z.string().trim().min(1).max(160);
const text2k   = z.string().max(2000).default("");

export const ClassInput = z.object({
  name: name160,
  section: z.string().max(80).default(""),
  subject_id: uuidish,
  student_count: z.number().int().min(0).default(0),
});
export const ClassPatch = ClassInput.partial();

export const StudentInput = z.object({
  class_id: uuidish,
  name: name160,
  email: z.string().email().or(z.literal("")).default(""),
  roll_no: z.string().max(40).default(""),
});
export const StudentPatch = StudentInput.partial();

export const AttendanceInput = z.object({
  class_id: uuidish,
  subject_id: uuidish,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
  status: z.enum(["present", "absent", "late", "excused"]),
  notes: text2k,
});
export const AttendancePatch = AttendanceInput.partial();

export const AssignmentInput = z.object({
  class_id: uuidish,
  subject_id: uuidish,
  student_user_id: uuidish,
  title: name160,
  due_at: z.string().datetime().nullable().optional(),
  max_marks: z.number().int().min(0).nullable().optional(),
  status: z.enum(["open", "submitted", "graded", "closed"]).default("open"),
});
export const AssignmentPatch = AssignmentInput.partial();

export const SubmissionInput = z.object({
  assignment_id: z.string().uuid(),
  marks: z.number().int().min(0).nullable().optional(),
  feedback: text2k,
});
export const SubmissionPatch = SubmissionInput.partial();

export const ExamInput = z.object({
  subject_id: uuidish,
  title: name160,
  date: z.string().datetime().nullable().optional(),
  max_marks: z.number().int().min(0).nullable().optional(),
  score: z.number().int().min(0).nullable().optional(),
});
export const ExamPatch = ExamInput.partial();

export const ProjectInput = z.object({
  name: name160,
  description: text2k,
  status: z.enum(["active", "paused", "completed", "archived"]).default("active"),
  deadline: z.string().datetime().nullable().optional(),
});
export const ProjectPatch = ProjectInput.partial();

export const MeetingInput = z.object({
  project_id: uuidish,
  title: name160,
  start_at: z.string().datetime(),
  end_at: z.string().datetime().nullable().optional(),
  attendees: z.array(z.string().max(160)).max(100).default([]),
  notes: text2k,
});
export const MeetingPatch = MeetingInput.partial();

export const TeamMemberInput = z.object({
  name: name160,
  email: z.string().email().or(z.literal("")).default(""),
  role: z.string().max(120).default(""),
  workload_pct: z.number().int().min(0).max(100).default(0),
});
export const TeamMemberPatch = TeamMemberInput.partial();

export const NoteInput = z.object({
  scope: z.enum(["global", "semester", "project", "class"]).default("global"),
  scope_id: uuidish,
  title: name160,
  body: text2k,
});
export const NotePatch = NoteInput.partial();

export const AnnouncementInput = z.object({
  class_id: uuidish,
  title: name160,
  body: text2k,
});
export const AnnouncementPatch = AnnouncementInput.partial();

export const GoalInput = z.object({
  title: name160,
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  progress_pct: z.number().int().min(0).max(100).default(0),
  category: z.string().max(80).default(""),
});
export const GoalPatch = GoalInput.partial();
