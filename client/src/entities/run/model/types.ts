// Контракт совпадает с server/src/shared/run/run.store.ts
export type RunStatus = "idle" | "running" | "done" | "stopped" | "error";

export interface RunLogEntry {
  at: string;
  message: string;
}

export interface CaptchaRequest {
  image: string; // data:image/png;base64,…
  wrong: boolean;
}

export interface CodeRequest {
  email: string;
  wrong: boolean;
  attempt: number;
}

export type CaptchaAnswer = { action: "solve"; text: string } | { action: "refresh" };

export interface RunSnapshot {
  version: number;
  status: RunStatus;
  captcha: CaptchaRequest | null;
  code: CodeRequest | null;
  count: number;
  sent: number;
  skipped: number;
  failed: number;
  note: string;
  error: string | null;
  errorCode: string | null;
  log: RunLogEntry[];
  startedAt: string | null;
  finishedAt: string | null;
}

export type AuthMode = "password" | "code";

export interface StartRunPayload {
  login: string;
  authMode: AuthMode;
  password: string;
  // ключ устройства: им сервер шифрует сессию в режиме «код из почты»
  deviceKey: string;
  keywords: string[];
  count: number;
  coverLetter: string;
  filters: SearchFilters;
}

// фильтры выдачи в формате сервера (start-run.validate.ts)
export interface SearchFilters {
  area: string | null;
  experience: string[];
  workFormat: string[];
  salary: number | null;
  onlyWithSalary: boolean;
  searchFields: string[];
  excludedText: string;
  labels: string[];
}
