// Раздача собранного фронта (client/dist) с SPA-фолбэком на index.html.
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import type { Handler } from "./http.types.js";
import { HttpError } from "./http.json.js";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".json": "application/json",
};

async function isFile(path: string) {
  return stat(path).then((s) => s.isFile()).catch(() => false);
}

export function serveStatic(dir: string): Handler {
  const root = normalize(dir + sep);

  return async (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") throw new HttpError(404, "not found");
    const { pathname } = new URL(req.url ?? "/", "http://localhost");
    let decoded: string;
    try {
      decoded = decodeURIComponent(pathname);
    } catch {
      throw new HttpError(400, "bad path");
    }
    const requested = normalize(join(root, decoded));
    if (!requested.startsWith(root)) throw new HttpError(404, "not found");

    const file = (await isFile(requested)) ? requested : join(root, "index.html");
    if (!(await isFile(file))) throw new HttpError(404, "client is not built");

    res.writeHead(200, {
      "Content-Type": MIME[extname(file)] ?? "application/octet-stream",
      // в /assets/ имена с хешем — их можно кэшировать навсегда,
      // index.html — никогда, иначе после деплоя останется старый фронт
      "Cache-Control": file.includes(`${sep}assets${sep}`)
        ? "public, max-age=31536000, immutable"
        : "no-cache",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
    });
    if (req.method === "HEAD") return void res.end();
    createReadStream(file).pipe(res);
  };
}
