// Кто этот клиент: случайный id в cookie, выданный при первом запросе.
// По нему сервер отделяет прогоны разных людей, которые заходят на сайт
// под одним общим Basic-паролем.
import { randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

const COOKIE = "otklik_client";
const VALID = /^[A-Za-z0-9_-]{32,64}$/;
const YEAR = 365 * 24 * 60 * 60;

type Listener = (req: IncomingMessage, res: ServerResponse) => unknown;

const ids = new WeakMap<IncomingMessage, string>();

function readCookie(req: IncomingMessage, name: string): string | null {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return value.join("=");
  }
  return null;
}

export function withClientId(listener: Listener): Listener {
  return (req, res) => {
    let id = readCookie(req, COOKIE);
    if (!id || !VALID.test(id)) {
      id = randomBytes(24).toString("base64url");
      // HttpOnly — скрипты страницы id не видят; SameSite=Strict — чужой сайт
      // не отправит запрос от имени клиента; Secure — когда сайт за HTTPS
      const secure = req.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
      res.setHeader(
        "Set-Cookie",
        `${COOKIE}=${id}; Path=/; Max-Age=${YEAR}; HttpOnly; SameSite=Strict${secure}`,
      );
    }
    ids.set(req, id);
    return listener(req, res);
  };
}

export function clientId(req: IncomingMessage): string {
  const id = ids.get(req);
  if (!id) throw new Error("withClientId is not installed");
  return id;
}
