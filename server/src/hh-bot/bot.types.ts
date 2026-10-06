import type { FILTER_OPTIONS } from "./bot.constants.js";

export type AuthMode = "password" | "code";

type Option<K extends keyof typeof FILTER_OPTIONS> = (typeof FILTER_OPTIONS)[K][number];

export interface SearchFilters {
  area: Option<"area"> | null; // null — все регионы
  experience: Option<"experience">[];
  workFormat: Option<"workFormat">[];
  salary: number | null; // доход от, ₽
  onlyWithSalary: boolean;
  searchFields: Option<"searchField">[]; // пусто — везде
  excludedText: string;
  labels: Option<"label">[];
}

export interface RunConfig {
  login: string;
  authMode: AuthMode;
  password: string; // пусто в режиме code
  // чем шифруется сохранённая сессия: пароль либо ключ устройства из браузера
  sessionSecret: string;
  keywords: string[];
  count: number;
  coverLetter: string;
  filters: SearchFilters;
}

export interface RunProgress {
  sent: number;
  skipped: number;
  failed: number;
}

export type CaptchaAnswer =
  | { action: "solve"; text: string }
  | { action: "refresh" };

export interface CaptchaRequest {
  image: string; // data:image/png;base64,…
  wrong: boolean; // прошлый ответ не подошёл
}

// Капчу решает человек: бот отдаёт картинку и ждёт ответа.
export type CaptchaSolver = (
  request: CaptchaRequest,
  signal: AbortSignal,
) => Promise<CaptchaAnswer>;

export interface CodeRequest {
  email: string;
  wrong: boolean; // прошлый код не подошёл
  attempt: number; // номер запроса: фронт по нему понимает, что поле надо очистить
}

// Код из письма вводит человек: бот сообщает, куда он ушёл, и ждёт.
export type CodeSolver = (request: CodeRequest, signal: AbortSignal) => Promise<string>;

export interface BotReporter {
  // этап прогона для строки статуса («logging in», «applying…»)
  stage(note: string): void;
  log(message: string): void;
  progress(progress: RunProgress): void;
  solveCaptcha: CaptchaSolver;
  enterCode: CodeSolver;
}

export type BotErrorCode = "login_timeout" | "bad_credentials" | "no_results";

export class BotError extends Error {
  readonly code: BotErrorCode;

  constructor(code: BotErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}
