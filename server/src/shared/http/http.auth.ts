// HTTP Basic: браузер сам показывает окно логина и дальше прикладывает
// заголовок ко всем запросам этого сайта — включая EventSource.
import { createHash, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";

type Listener = (req: IncomingMessage, res: ServerResponse) => unknown;

// сравниваем хеши: длина одинаковая, время сравнения не зависит от данных
const digest = (value: string) => createHash("sha256").update(value).digest();

export function withBasicAuth(
  listener: Listener,
  credentials: { user: string; password: string },
  publicPaths: string[] = [],
): Listener {
  const expected = digest(`${credentials.user}:${credentials.password}`);

  return (req, res) => {
    const { pathname } = new URL(req.url ?? "/", "http://localhost");
    if (publicPaths.includes(pathname)) return listener(req, res);

    const header = req.headers.authorization ?? "";
    const given = header.startsWith("Basic ")
      ? Buffer.from(header.slice(6), "base64").toString("utf8")
      : "";
    if (given && timingSafeEqual(digest(given), expected)) return listener(req, res);

    res.writeHead(401, {
      "WWW-Authenticate": 'Basic realm="OTKLIK", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
    });
    return res.end("authentication required");
  };
}
