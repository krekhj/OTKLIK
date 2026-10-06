import { HttpError, sendJson } from "../../shared/http/http.json.js";
import type { Route } from "../../shared/http/http.types.js";
import { clientId } from "../../shared/http/http.client.js";
import { runs } from "../../shared/run/run.registry.js";

export const stopRunRoute: Route = {
  method: "POST",
  path: "/api/run/stop",
  handler(req, res) {
    const store = runs.of(clientId(req));
    if (!store.stop()) throw new HttpError(409, "nothing is running");
    sendJson(res, 202, store.snapshot);
  },
};
