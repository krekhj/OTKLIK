import { HttpError, readJson, sendJson } from "../../shared/http/http.json.js";
import type { Route } from "../../shared/http/http.types.js";
import { clientId } from "../../shared/http/http.client.js";
import { runs } from "../../shared/run/run.registry.js";

const MAX_CODE = 12;

export const submitCodeRoute: Route = {
  method: "POST",
  path: "/api/run/code",
  async handler(req, res) {
    const store = runs.of(clientId(req));
    const body = (await readJson(req)) as Record<string, unknown> | null;
    // пробелы и дефисы из письма («123 456») убираем
    const code = typeof body?.code === "string" ? body.code.replace(/[\s-]/g, "") : "";
    if (!code || code.length > MAX_CODE) {
      throw new HttpError(422, "validation failed", { code: "enter the code from the email" });
    }
    if (!store.answerCode(code)) throw new HttpError(409, "no code is awaited");
    sendJson(res, 202, store.snapshot);
  },
};
