// Лимиты совпадают с server/src/features/start-run/start-run.validate.ts
export const RUN_LIMITS = {
  keywords: 10,
  keywordLength: 60,
  minCount: 1,
  maxCount: 200,
  letter: 1000,
} as const;

import type { RunFilters } from "./filters";

export type AuthMode = "password" | "code";

export interface RunFormValues {
  login: string;
  authMode: AuthMode;
  password: string;
  keywords: string[];
  count: number;
  coverLetter: string;
  filters: RunFilters;
}

export type RunFormErrors = Partial<Record<keyof RunFormValues, string>>;

export function validateRunForm(values: RunFormValues): RunFormErrors {
  const errors: RunFormErrors = {};
  if (!values.login.trim()) errors.login = "enter your hh.ru login";
  if (values.authMode === "password" && !values.password) errors.password = "enter your password";
  if (values.keywords.length === 0) errors.keywords = "add at least one keyword";
  return errors;
}
