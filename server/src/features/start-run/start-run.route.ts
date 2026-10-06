import { runBot } from "../../hh-bot/bot.service.js";
import { BotError } from "../../hh-bot/bot.types.js";
import { firstLine } from "../../hh-bot/bot.utils.js";
import { HttpError, readJson, sendJson } from "../../shared/http/http.json.js";
import type { Route } from "../../shared/http/http.types.js";
import { config } from "../../config.js";
import { clientId } from "../../shared/http/http.client.js";
import { runs } from "../../shared/run/run.registry.js";
import { validateStartRun } from "./start-run.validate.js";

export const startRunRoute: Route = {
  method: "POST",
  path: "/api/run/start",
  async handler(req, res) {
    const run = validateStartRun(await readJson(req));
    const store = runs.of(clientId(req));
    if (store.isRunning) throw new HttpError(409, "a run is already in progress");
    // у каждого прогона свой Chromium — сверх лимита сервер не потянет
    if (runs.runningCount >= config.maxRuns) {
      throw new HttpError(503, `server is busy: ${config.maxRuns} runs in progress, try again later`);
    }
    // два прогона одного hh-аккаунта мешали бы друг другу (и сессии)
    if (runs.isLoginRunning(run.login)) {
      throw new HttpError(409, "this hh.ru account is already running in another browser");
    }

    const signal = store.start(run.count, run.login);
    // прогон идёт в фоне, клиент следит за ним через /api/run/events
    runBot(run, store, signal)
      .then((result) => store.finish(result))
      .catch((error: unknown) => {
        // STOP закрывает браузер и прерывает ожидания — это не ошибка
        if (signal.aborted) return store.fail("stopped");
        if (error instanceof BotError) {
          return store.fail(error.message, error.code);
        }
        console.error(error);
        store.fail(error instanceof Error ? error.message : firstLine(error));
      });

    sendJson(res, 202, store.snapshot);
  },
};
