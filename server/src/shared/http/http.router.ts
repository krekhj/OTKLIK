import type { IncomingMessage, ServerResponse } from "node:http";
import { HttpError, sendJson } from "./http.json.js";
import type { Handler, Route } from "./http.types.js";

export function createRouter(routes: Route[], fallback?: Handler) {
  const table = new Map(routes.map((r) => [`${r.method} ${r.path}`, r.handler]));
  const paths = new Set(routes.map((r) => r.path));

  return async (req: IncomingMessage, res: ServerResponse) => {
    const { pathname } = new URL(req.url ?? "/", "http://localhost");
    const handler = table.get(`${req.method} ${pathname}`);

    try {
      if (handler) return await handler(req, res);
      if (paths.has(pathname)) throw new HttpError(405, "method not allowed");
      if (fallback && !pathname.startsWith("/api/")) return await fallback(req, res);
      throw new HttpError(404, "not found");
    } catch (error) {
      if (res.headersSent) return void res.end();
      if (error instanceof HttpError) {
        return sendJson(res, error.status, {
          error: error.message,
          details: error.details,
        });
      }
      console.error(error);
      sendJson(res, 500, { error: "internal error" });
    }
  };
}
