// Фильтры выдачи. Значения — параметры URL hh (сверены с живым сайтом),
// список совпадает с FILTER_OPTIONS в server/src/hh-bot/bot.constants.ts.

export const AREA_OPTIONS = [
  { value: "", label: "any region" },
  { value: "113", label: "Russia" },
  { value: "1", label: "Moscow" },
  { value: "2", label: "Saint Petersburg" },
  { value: "3", label: "Yekaterinburg" },
  { value: "4", label: "Novosibirsk" },
  { value: "88", label: "Kazan" },
  { value: "66", label: "Nizhny Novgorod" },
] as const;

export const EXPERIENCE_OPTIONS = [
  { value: "noExperience", label: "none" },
  { value: "between1And3", label: "1–3 y" },
  { value: "between3And6", label: "3–6 y" },
  { value: "moreThan6", label: "6+ y" },
] as const;

export const WORK_FORMAT_OPTIONS = [
  { value: "REMOTE", label: "remote" },
  { value: "HYBRID", label: "hybrid" },
  { value: "ON_SITE", label: "on-site" },
  { value: "FIELD_WORK", label: "field" },
] as const;

export const SEARCH_FIELD_OPTIONS = [
  { value: "name", label: "title" },
  { value: "company_name", label: "company" },
  { value: "description", label: "description" },
] as const;

export const LABEL_OPTIONS = [
  { value: "not_from_agency", label: "no recruiting agencies" },
  { value: "low_performance", label: "fewer than 10 applicants" },
  { value: "accredited_it", label: "accredited IT companies" },
] as const;

type Values<T extends readonly { value: string }[]> = T[number]["value"];

export interface RunFilters {
  area: Values<typeof AREA_OPTIONS>;
  experience: Values<typeof EXPERIENCE_OPTIONS>[];
  workFormat: Values<typeof WORK_FORMAT_OPTIONS>[];
  salary: string; // как в поле ввода; на сервер уходит числом
  onlyWithSalary: boolean;
  searchFields: Values<typeof SEARCH_FIELD_OPTIONS>[];
  excludedText: string;
  labels: Values<typeof LABEL_OPTIONS>[];
}

export const DEFAULT_FILTERS: RunFilters = {
  area: "",
  experience: ["noExperience", "between1And3"],
  workFormat: [],
  salary: "",
  onlyWithSalary: false,
  searchFields: [],
  excludedText: "",
  labels: [],
};

const only = <T extends string>(value: unknown, options: readonly { value: T }[]): T[] =>
  Array.isArray(value)
    ? value.filter((v): v is T => options.some((o) => o.value === v))
    : [];

// из localStorage может прийти что угодно — берём только известное
export function restoreFilters(raw: unknown): RunFilters {
  if (!raw || typeof raw !== "object") return DEFAULT_FILTERS;
  const f = raw as Record<string, unknown>;
  return {
    area: AREA_OPTIONS.some((o) => o.value === f.area) ? (f.area as RunFilters["area"]) : "",
    experience: Array.isArray(f.experience) ? only(f.experience, EXPERIENCE_OPTIONS) : DEFAULT_FILTERS.experience,
    workFormat: only(f.workFormat, WORK_FORMAT_OPTIONS),
    salary: typeof f.salary === "string" ? f.salary.replace(/\D/g, "") : "",
    onlyWithSalary: f.onlyWithSalary === true,
    searchFields: only(f.searchFields, SEARCH_FIELD_OPTIONS),
    excludedText: typeof f.excludedText === "string" ? f.excludedText : "",
    labels: only(f.labels, LABEL_OPTIONS),
  };
}

// совпадает с MAX_SALARY в start-run.validate.ts
export const MAX_SALARY = 10_000_000;

// в запрос: пустые строки → null, доход — числом
export function filtersPayload(f: RunFilters) {
  return {
    ...f,
    area: f.area || null,
    salary: f.salary ? Math.min(Number(f.salary), MAX_SALARY) : null,
    excludedText: f.excludedText.trim(),
  };
}

export function countActiveFilters(f: RunFilters): number {
  return (
    (f.area ? 1 : 0) +
    f.experience.length +
    f.workFormat.length +
    (f.salary ? 1 : 0) +
    (f.onlyWithSalary ? 1 : 0) +
    f.searchFields.length +
    (f.excludedText.trim() ? 1 : 0) +
    f.labels.length
  );
}
