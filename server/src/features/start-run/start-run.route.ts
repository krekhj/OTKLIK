import { runBot } from "../../hh-bot/bot.service.js";
import { BotError } from "../../hh-bot/bot.types.js";
import { firstLine } from "../../hh-bot/bot.utils.js";
import { HttpError, readJson, sendJson } from "../../shared/http/http.json.js";
import type { Route } from "../../shared/http/http.types.js";
import { runStore } from "../../shared/run/run.store.js";
import { validateStartRun } from "./start-run.validate.js";

export const startRunRoute: Route = {
  method: "POST",
  path: "/api/run/start",
  async handler(req, res) {
    const run = validateStartRun(await readJson(req));
    if (runStore.isRunning) throw new HttpError(409, "a run is already in progress");

    const signal = runStore.start(run.count);
    // прогон идёт в фоне, клиент следит за ним через /api/run/events
    runBot(run, runStore, signal)
      .then((result) => runStore.finish(result))
      .catch((error: unknown) => {
        // STOP закрывает браузер и прерывает ожидания — это не ошибка
        if (signal.aborted) return runStore.fail("stopped");
        if (error instanceof BotError) {
          return runStore.fail(error.message, error.code);
        }
        console.error(error);
        runStore.fail(error instanceof Error ? error.message : firstLine(error));
      });

    sendJson(res, 202, runStore.snapshot);
  },
};
