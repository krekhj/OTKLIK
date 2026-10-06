import { sendJson } from "../../shared/http/http.json.js";
import type { Route } from "../../shared/http/http.types.js";

// для healthcheck docker/прокси: без авторизации и без данных прогона
export const healthRoute: Route = {
  method: "GET",
  path: "/healthz",
  handler(_req, res) {
    sendJson(res, 200, { ok: true });
  },
};
