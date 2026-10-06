import { sendJson } from "../../shared/http/http.json.js";
import type { Route } from "../../shared/http/http.types.js";
import { runStore } from "../../shared/run/run.store.js";

export const getRunRoute: Route = {
  method: "GET",
  path: "/api/run",
  handler(_req, res) {
    sendJson(res, 200, runStore.snapshot);
  },
};
