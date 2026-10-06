import { sendJson } from "../../shared/http/http.json.js";
import type { Route } from "../../shared/http/http.types.js";
import { clientId } from "../../shared/http/http.client.js";
import { runs } from "../../shared/run/run.registry.js";

export const getRunRoute: Route = {
  method: "GET",
  path: "/api/run",
  handler(req, res) {
    sendJson(res, 200, runs.of(clientId(req)).snapshot);
  },
};
