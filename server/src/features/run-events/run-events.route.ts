// Server-Sent Events: живой прогресс прогона без опроса.
import type { ServerResponse } from "node:http";
import type { Route } from "../../shared/http/http.types.js";
import { runStore, type RunSnapshot } from "../../shared/run/run.store.js";

const HEARTBEAT_MS = 25_000;

function send(res: ServerResponse, snapshot: RunSnapshot) {
  res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
}

export const runEventsRoute: Route = {
  method: "GET",
  path: "/api/run/events",
  handler(req, res) {
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });
    send(res, runStore.snapshot);

    const unsubscribe = runStore.subscribe((snapshot) => send(res, snapshot));
    // комментарий раз в 25 с не даёт прокси закрыть «молчащее» соединение
    const heartbeat = setInterval(() => res.write(": ping\n\n"), HEARTBEAT_MS);

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
    });
  },
};
