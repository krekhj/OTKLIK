import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { config } from "./config.js";
import { healthRoute } from "./features/health/health.route.js";
import { getRunRoute } from "./features/get-run/get-run.route.js";
import { resetRunRoute } from "./features/reset-run/reset-run.route.js";
import { runEventsRoute } from "./features/run-events/run-events.route.js";
import { solveCaptchaRoute } from "./features/solve-captcha/solve-captcha.route.js";
import { submitCodeRoute } from "./features/submit-code/submit-code.route.js";
import { startRunRoute } from "./features/start-run/start-run.route.js";
import { stopRunRoute } from "./features/stop-run/stop-run.route.js";
import { withBasicAuth } from "./shared/http/http.auth.js";
import { createRouter } from "./shared/http/http.router.js";
import { serveStatic } from "./shared/http/http.static.js";

const routes = [
  healthRoute,
  getRunRoute,
  startRunRoute,
  stopRunRoute,
  resetRunRoute,
  runEventsRoute,
  solveCaptchaRoute,
  submitCodeRoute,
];

export function createApp() {
  const fallback = existsSync(config.clientDir)
    ? serveStatic(config.clientDir)
    : undefined;
  const router = createRouter(routes, fallback);
  return createServer(
    config.auth ? withBasicAuth(router, config.auth, [healthRoute.path]) : router,
  );
}
