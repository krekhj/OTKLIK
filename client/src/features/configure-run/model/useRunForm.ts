import { useEffect, useState } from "react";
import { readStorage, writeStorage } from "@/shared/lib";
import { DEFAULT_FILTERS, restoreFilters } from "./filters";
import { validateRunForm, type RunFormErrors, type RunFormValues } from "./validate";

const STORAGE_KEY = "otklik:setup";

// пароль в браузере не сохраняем никогда
type Persisted = Omit<RunFormValues, "password">;

const defaults: RunFormValues = {
  login: "",
  authMode: "password",
  password: "",
  keywords: [],
  count: 20,
  coverLetter: "",
  filters: DEFAULT_FILTERS,
};

function restore(): RunFormValues {
  const saved = readStorage<Partial<Persisted>>(STORAGE_KEY) ?? {};
  return {
    ...defaults,
    login: typeof saved.login === "string" ? saved.login : defaults.login,
    authMode: saved.authMode === "code" ? "code" : "password",
    keywords: Array.isArray(saved.keywords) ? saved.keywords.filter((k) => typeof k === "string") : [],
    count: typeof saved.count === "number" ? saved.count : defaults.count,
    coverLetter: typeof saved.coverLetter === "string" ? saved.coverLetter : "",
    filters: restoreFilters(saved.filters),
  };
}

export function useRunForm() {
  const [values, setValues] = useState(restore);
  const [tried, setTried] = useState(false);
  const [serverErrors, setServerErrors] = useState<RunFormErrors>({});

  const { login, authMode, keywords, count, coverLetter, filters } = values;
  useEffect(() => {
    writeStorage(STORAGE_KEY, {
      login,
      authMode,
      keywords,
      count,
      coverLetter,
      filters,
    } satisfies Persisted);
  }, [login, authMode, keywords, count, coverLetter, filters]);

  // ошибки показываем только после первой попытки запуска
  const errors: RunFormErrors = { ...serverErrors, ...(tried ? validateRunForm(values) : {}) };

  function set<K extends keyof RunFormValues>(field: K, value: RunFormValues[K]) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setServerErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  // Возвращает значения, если форма валидна, иначе null.
  function submit(): RunFormValues | null {
    setTried(true);
    const found = validateRunForm(values);
    return Object.keys(found).length === 0 ? values : null;
  }

  return { values, errors, set, submit, setServerErrors };
}

export type RunForm = ReturnType<typeof useRunForm>;
