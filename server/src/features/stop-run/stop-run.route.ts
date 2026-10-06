import { HttpError, sendJson } from "../../shared/http/http.json.js";
import type { Route } from "../../shared/http/http.types.js";
import { runStore } from "../../shared/run/run.store.js";

export const stopRunRoute: Route = {
  method: "POST",
  path: "/api/run/stop",
  handler(_req, res) {
    if (!runStore.stop()) throw new HttpError(409, "nothing is running");
    sendJson(res, 202, runStore.snapshot);
  },
};
