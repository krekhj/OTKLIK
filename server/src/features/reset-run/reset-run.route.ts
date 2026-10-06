import { HttpError, sendJson } from "../../shared/http/http.json.js";
import type { Route } from "../../shared/http/http.types.js";
import { clientId } from "../../shared/http/http.client.js";
import { runs } from "../../shared/run/run.registry.js";

export const resetRunRoute: Route = {
  method: "POST",
  path: "/api/run/reset",
  handler(req, res) {
    const store = runs.of(clientId(req));
    if (!store.reset()) throw new HttpError(409, "stop the run first");
    sendJson(res, 200, store.snapshot);
  },
};
