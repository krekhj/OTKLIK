import { postJson, request } from "@/shared/api";
import type { CaptchaAnswer, RunSnapshot, StartRunPayload } from "../model/types";

export const RUN_EVENTS_URL = "/api/run/events";

export const runApi = {
  get: () => request<RunSnapshot>("/api/run"),
  start: (payload: StartRunPayload) => postJson<RunSnapshot>("/api/run/start", payload),
  stop: () => postJson<RunSnapshot>("/api/run/stop"),
  reset: () => postJson<RunSnapshot>("/api/run/reset"),
  submitCode: (code: string) => postJson<RunSnapshot>("/api/run/code", { code }),
  answerCaptcha: (answer: CaptchaAnswer) => postJson<RunSnapshot>("/api/run/captcha", answer),
};
