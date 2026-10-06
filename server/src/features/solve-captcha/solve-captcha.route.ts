import type { CaptchaAnswer } from "../../hh-bot/bot.types.js";
import { HttpError, readJson, sendJson } from "../../shared/http/http.json.js";
import type { Route } from "../../shared/http/http.types.js";
import { runStore } from "../../shared/run/run.store.js";

const MAX_TEXT = 50;

function validate(body: unknown): CaptchaAnswer {
  const input = (body ?? {}) as Record<string, unknown>;
  if (input.action === "refresh") return { action: "refresh" };

  const text = typeof input.text === "string" ? input.text.trim() : "";
  if (input.action !== "solve" || !text || text.length > MAX_TEXT) {
    throw new HttpError(422, "validation failed", { text: "enter the text from the picture" });
  }
  return { action: "solve", text };
}

export const solveCaptchaRoute: Route = {
  method: "POST",
  path: "/api/run/captcha",
  async handler(req, res) {
    const answer = validate(await readJson(req));
    if (!runStore.answerCaptcha(answer)) throw new HttpError(409, "no captcha is waiting");
    sendJson(res, 202, runStore.snapshot);
  },
};
