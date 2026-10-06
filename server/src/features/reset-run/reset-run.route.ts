import { HttpError, sendJson } from "../../shared/http/http.json.js";
import type { Route } from "../../shared/http/http.types.js";
import { runStore } from "../../shared/run/run.store.js";

export const resetRunRoute: Route = {
  method: "POST",
  path: "/api/run/reset",
  handler(_req, res) {
    if (!runStore.reset()) throw new HttpError(409, "stop the run first");
    sendJson(res, 200, runStore.snapshot);
  },
};
