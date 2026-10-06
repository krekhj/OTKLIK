// Состояние единственного прогона бота: браузер один, прогон тоже один.
// Подписчики (SSE) получают снимок при каждом изменении.
import { EventEmitter } from "node:events";
import type {
  CaptchaAnswer,
  CaptchaRequest,
  CodeRequest,
  RunProgress,
} from "../../hh-bot/bot.types.js";

export type RunStatus = "idle" | "running" | "done" | "stopped" | "error";

export interface RunLogEntry {
  at: string;
  message: string;
}

export interface RunSnapshot extends RunProgress {
  // растёт с каждым изменением: ответ на POST и событие SSE идут по разным
  // соединениям, и клиент по версии отбрасывает устаревший снимок
  version: number;
  status: RunStatus;
  // капча ждёт человека; null — не ждёт
  captcha: CaptchaRequest | null;
  // бот ждёт код из письма; null — не ждёт
  code: CodeRequest | null;
  count: number;
  note: string;
  error: string | null;
  // машинный код ошибки бота (bad_credentials, …), чтобы фронт подсветил поля
  errorCode: string | null;
  log: RunLogEntry[];
  startedAt: string | null;
  finishedAt: string | null;
}

const LOG_LIMIT = 100;

const initial = (): RunSnapshot => ({
  version: 0,
  status: "idle",
  captcha: null,
  code: null,
  count: 0,
  sent: 0,
  skipped: 0,
  failed: 0,
  note: "ready",
  error: null,
  errorCode: null,
  log: [],
  startedAt: null,
  finishedAt: null,
});

class RunStore {
  private state = initial();
  private controller: AbortController | null = null;
  private readonly pending: Record<"captcha" | "code", ((answer: unknown) => void) | null> = {
    captcha: null,
    code: null,
  };
  private readonly events = new EventEmitter().setMaxListeners(100);

  get snapshot(): RunSnapshot {
    return this.state;
  }

  get isRunning(): boolean {
    return this.state.status === "running";
  }

  subscribe(listener: (snapshot: RunSnapshot) => void): () => void {
    this.events.on("change", listener);
    return () => this.events.off("change", listener);
  }

  start(count: number): AbortSignal {
    this.controller = new AbortController();
    this.set({
      ...initial(),
      status: "running",
      count,
      note: "starting",
      startedAt: new Date().toISOString(),
    });
    return this.controller.signal;
  }

  stop(): boolean {
    if (!this.isRunning || !this.controller) return false;
    this.controller.abort();
    this.set({ note: "stopping" });
    return true;
  }

  stage(note: string) {
    this.set({ note });
  }

  progress(progress: RunProgress) {
    this.set(progress);
  }

  log(message: string) {
    const entry = { at: new Date().toISOString(), message };
    this.set({ log: [...this.state.log, entry].slice(-LOG_LIMIT) });
  }

  // Бот ждёт человека: показываем вопрос в снимке и ждём ответа с фронта.
  // STOP снимает вопрос и прерывает ожидание.
  private ask<K extends "captcha" | "code", A>(
    field: K,
    request: NonNullable<RunSnapshot[K]>,
    notes: { waiting: string; checking: string },
    signal: AbortSignal,
  ): Promise<A> {
    return new Promise<A>((resolve, reject) => {
      const onAbort = () => {
        this.pending[field] = null;
        this.set({ [field]: null });
        reject(signal.reason);
      };
      if (signal.aborted) return onAbort();
      signal.addEventListener("abort", onAbort, { once: true });

      this.pending[field] = (answer: unknown) => {
        signal.removeEventListener("abort", onAbort);
        this.pending[field] = null;
        this.set({ [field]: null, note: notes.checking });
        resolve(answer as A);
      };
      this.set({ [field]: request, note: notes.waiting });
    });
  }

  private answer(field: "captcha" | "code", answer: unknown): boolean {
    const resolve = this.pending[field];
    if (!resolve) return false;
    resolve(answer);
    return true;
  }

  // BotReporter: стрелки — методы передаются боту без привязки к this
  solveCaptcha = (request: CaptchaRequest, signal: AbortSignal) =>
    this.ask<"captcha", CaptchaAnswer>(
      "captcha",
      request,
      { waiting: "waiting for captcha", checking: "checking captcha" },
      signal,
    );

  enterCode = (request: CodeRequest, signal: AbortSignal) =>
    this.ask<"code", string>(
      "code",
      request,
      { waiting: "waiting for the email code", checking: "checking the code" },
      signal,
    );

  answerCaptcha(answer: CaptchaAnswer): boolean {
    return this.answer("captcha", answer);
  }

  answerCode(code: string): boolean {
    return this.answer("code", code);
  }

  finish(progress: RunProgress) {
    const stopped = this.controller?.signal.aborted ?? false;
    this.end({
      ...progress,
      status: stopped ? "stopped" : "done",
      note: stopped
        ? "stopped by you"
        : progress.sent >= this.state.count
          ? "all applications sent"
          : "no more matching vacancies",
    });
  }

  fail(error: string, errorCode: string | null = null) {
    // остановка закрывает браузер, и Playwright бросает — это не ошибка
    if (this.controller?.signal.aborted) {
      return this.end({ status: "stopped", note: "stopped by you" });
    }
    this.end({ status: "error", note: "failed", error, errorCode });
  }

  reset(): boolean {
    if (this.isRunning) return false;
    this.set(initial());
    return true;
  }

  private end(patch: Partial<RunSnapshot>) {
    this.controller = null;
    this.pending.captcha = null;
    this.pending.code = null;
    this.set({ captcha: null, code: null, ...patch, finishedAt: new Date().toISOString() });
  }

  private set(patch: Partial<RunSnapshot>) {
    this.state = { ...this.state, ...patch, version: this.state.version + 1 };
    this.events.emit("change", this.state);
  }
}

export const runStore = new RunStore();
