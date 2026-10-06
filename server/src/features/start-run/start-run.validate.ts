import { DEFAULT_COVER_LETTER, FILTER_OPTIONS } from "../../hh-bot/bot.constants.js";
import type { AuthMode, RunConfig, SearchFilters } from "../../hh-bot/bot.types.js";
import { HttpError } from "../../shared/http/http.json.js";

export const LIMITS = {
  keywords: 10,
  keywordLength: 60,
  count: 200,
  letter: 1000,
  credential: 200,
  // ключ устройства из браузера: 32 случайных байта в base64url
  deviceKey: { min: 32, max: 128 },
} as const;

type Errors = Record<string, string>;

const MAX_SALARY = 10_000_000;
const MAX_EXCLUDED = 200;

// Оставляет только известные hh значения, без повторов.
function pick<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((v): v is T => allowed.includes(v as T)))];
}

// Фильтры не обязательны: без них — прежнее поведение (опыт до 3 лет).
function validateFilters(raw: unknown, errors: Errors): SearchFilters {
  const input = (raw ?? {}) as Record<string, unknown>;
  const o = FILTER_OPTIONS;

  const area = o.area.includes(input.area as never) ? (input.area as SearchFilters["area"]) : null;

  let salary: number | null = null;
  if (input.salary !== null && input.salary !== undefined && input.salary !== "") {
    const n = Number(input.salary);
    if (!Number.isInteger(n) || n < 0 || n > MAX_SALARY) errors.salary = "salary must be a whole number";
    else salary = n || null;
  }

  const excludedText = text(input.excludedText);
  if (excludedText.length > MAX_EXCLUDED) errors.excludedText = `at most ${MAX_EXCLUDED} characters`;

  return {
    area,
    experience: raw === undefined ? ["noExperience", "between1And3"] : pick(input.experience, o.experience),
    workFormat: pick(input.workFormat, o.workFormat),
    salary,
    onlyWithSalary: input.onlyWithSalary === true,
    searchFields: pick(input.searchFields, o.searchField),
    excludedText,
    labels: pick(input.labels, o.label),
  };
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateStartRun(body: unknown): RunConfig {
  const input = (body ?? {}) as Record<string, unknown>;
  const errors: Errors = {};

  const login = text(input.login);
  if (!login) errors.login = "enter your hh.ru login";
  else if (login.length > LIMITS.credential) errors.login = "login is too long";

  const authMode: AuthMode = input.authMode === "code" ? "code" : "password";

  // пароль не тримим: пробелы могут быть его частью
  const password =
    authMode === "password" && typeof input.password === "string" ? input.password : "";
  const deviceKey = typeof input.deviceKey === "string" ? input.deviceKey : "";
  if (authMode === "password") {
    if (!password) errors.password = "enter your password";
    else if (password.length > LIMITS.credential) errors.password = "password is too long";
  } else if (
    deviceKey.length < LIMITS.deviceKey.min ||
    deviceKey.length > LIMITS.deviceKey.max ||
    !/^[A-Za-z0-9_-]+$/.test(deviceKey)
  ) {
    errors.login = "browser device key is missing — reload the page";
  }

  const rawKeywords = Array.isArray(input.keywords) ? input.keywords : [];
  const keywords = [...new Set(rawKeywords.map(text).filter(Boolean))];
  if (keywords.length === 0) errors.keywords = "add at least one keyword";
  else if (keywords.length > LIMITS.keywords) errors.keywords = `at most ${LIMITS.keywords} keywords`;
  else if (keywords.some((k) => k.length > LIMITS.keywordLength)) {
    errors.keywords = `keyword is longer than ${LIMITS.keywordLength} characters`;
  }

  const count = input.count;
  if (typeof count !== "number" || !Number.isInteger(count) || count < 1 || count > LIMITS.count) {
    errors.count = `pick a number from 1 to ${LIMITS.count}`;
  }

  const letter = text(input.coverLetter);
  if (letter.length > LIMITS.letter) errors.coverLetter = `at most ${LIMITS.letter} characters`;

  const filters = validateFilters(input.filters, errors);

  if (Object.keys(errors).length > 0) {
    throw new HttpError(422, "validation failed", errors);
  }

  return {
    login,
    authMode,
    password,
    sessionSecret: authMode === "password" ? password : deviceKey,
    keywords,
    count: count as number,
    coverLetter: letter || DEFAULT_COVER_LETTER,
    filters,
  };
}
