export const PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;

export type PastCapstoneSource = "historical";

export interface PastCapstone {
  id: string;
  title: string;
  description: string;
  department: string[];
  year: string;
  students: string[];
  source: PastCapstoneSource;
  source_fk?: number | null;
  source_capstone_fk?: number | null;
  source_team_fk?: number | null;
  past_capstone_id?: number;
  completed_term?: string | null;
  skills: string[];
  deliverable_types: string[];
  mentor_name?: string | null;
  external_partner_name?: string | null;
  external_partner_organization?: string | null;
  problem_area?: string | null;
  main_objectives?: string | null;
}

export interface PastCapstoneApiResponse {
  success: boolean;
  source: PastCapstoneSource;
  data: PastCapstone[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface PastCapstoneMetadata {
  departments: string[];
  years: string[];
  courses: Array<{
    course_id: number;
    code: string;
    name: string;
  }>;
}

export interface PastCapstoneMetadataResponse {
  success: boolean;
  source: PastCapstoneSource;
  data: PastCapstoneMetadata;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

function asNullableString(value: unknown): string | null {
  const normalized = asString(value);
  return normalized || null;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => asString(entry))
      .filter((entry) => entry.length > 0);
  }

  if (typeof value !== "string") {
    return [];
  }

  const raw = value.trim();
  if (!raw) {
    return [];
  }

  if (raw.startsWith("{") && raw.endsWith("}")) {
    return raw
      .slice(1, -1)
      .split(",")
      .map((entry) => entry.trim().replace(/^"|"$/g, ""))
      .filter((entry) => entry.length > 0);
  }

  if (raw.includes(",")) {
    return raw
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return [raw];
}

export function normalizePastCapstone(
  raw: unknown,
  index: number,
  source: PastCapstoneSource
): PastCapstone {
  const capstone = asRecord(raw);
  const departments = asStringArray(capstone.department);
  const students = asStringArray(capstone.students ?? capstone.team_members);
  const year = asString(capstone.year, "Unknown");
  const description =
    asString(capstone.description) ||
    asString(capstone.main_objectives) ||
    asString(capstone.problem_area) ||
    "No description provided.";

  return {
    id: String(
      capstone.past_capstone_id ??
        capstone.capstone_id ??
        capstone.id ??
        `${source}-${index}`
    ),
    title: asString(capstone.title, "Untitled capstone"),
    description,
    department: departments.length > 0 ? departments : ["Unknown department"],
    year,
    students,
    source,
    source_fk: asNumber(capstone.source_fk) ?? null,
    source_capstone_fk: asNumber(capstone.source_capstone_fk) ?? null,
    source_team_fk: asNumber(capstone.source_team_fk) ?? null,
    past_capstone_id: asNumber(capstone.past_capstone_id),
    completed_term: asNullableString(capstone.completed_term),
    skills: asStringArray(capstone.skills),
    deliverable_types: asStringArray(capstone.deliverable_types),
    mentor_name: asNullableString(capstone.mentor_name),
    external_partner_name: asNullableString(capstone.external_partner_name),
    external_partner_organization: asNullableString(
      capstone.external_partner_organization
    ),
    problem_area: asNullableString(capstone.problem_area),
    main_objectives: asNullableString(capstone.main_objectives),
  };
}

export function normalizeMetadata(raw: unknown): PastCapstoneMetadata {
  const payload = asRecord(raw);
  const data = asRecord(payload.data ?? payload);
  const rawCourses = Array.isArray(data.courses) ? data.courses : [];

  return {
    departments: asStringArray(data.departments),
    years: asStringArray(data.years),
    courses: rawCourses
      .map((entry) => {
        const course = asRecord(entry);
        const courseId = asNumber(course.course_id);
        const code = asString(course.code);
        const name = asString(course.name);

        if (!courseId || !code) {
          return null;
        }

        return {
          course_id: courseId,
          code,
          name,
        };
      })
      .filter((course): course is PastCapstoneMetadata["courses"][number] =>
        Boolean(course)
      ),
  };
}
