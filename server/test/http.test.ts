import { testRoot } from "./helpers/env.js";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

// собранный «фронт» и авторизация — до импорта app (config читает env при импорте)
const clientDir = join(testRoot, "client");
mkdirSync(join(clientDir, "assets"), { recursive: true });
writeFileSync(join(clientDir, "index.html"), "<!doctype html><title>OTKLIK</title>");
writeFileSync(join(clientDir, "assets", "app-abc123.js"), "console.log(1)");
process.env.CLIENT_DIR = clientDir;
process.env.AUTH_USER = "admin";
process.env.AUTH_PASSWORD = "correct horse battery";
process.env.MAX_RUNS = "2";

const { createApp } = await import("../src/app.js");
const { runs } = await import("../src/shared/run/run.registry.js");
const server = createApp();
let base = "";
const auth = { Authorization: `Basic ${Buffer.from("admin:correct horse battery").toString("base64")}` };

const get = (path: string, init: RequestInit = {}) =>
  fetch(base + path, { ...init, headers: { ...auth, ...init.headers } });
const post = (path: string, body?: unknown) =>
  get(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? null : JSON.stringify(body),
  });

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => {
  server.closeAllConnections();
  server.close();
});

describe("авторизация", () => {
  it("/healthz открыт без пароля", async () => {
    const res = await fetch(base + "/healthz");
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  });

  it("без пароля и с неверным — 401 с Basic-вызовом", async () => {
    const res = await fetch(base + "/api/run");
    assert.equal(res.status, 401);
    assert.match(res.headers.get("www-authenticate") ?? "", /^Basic realm="OTKLIK"/);
    const wrong = await fetch(base + "/", {
      headers: { Authorization: `Basic ${Buffer.from("admin:nope").toString("base64")}` },
    });
    assert.equal(wrong.status, 401);
  });

  it("статика тоже за паролем", async () => {
    assert.equal((await fetch(base + "/assets/app-abc123.js")).status, 401);
  });
});

describe("API", () => {
  it("GET /api/run — снимок idle с версией", async () => {
    const run = (await (await get("/api/run")).json()) as { status: string; version: number };
    assert.equal(run.status, "idle");
    assert.equal(typeof run.version, "number");
  });

  it("start: невалидный запрос — 422 с ошибками полей, бот не стартует", async () => {
    const res = await post("/api/run/start", { authMode: "password", keywords: [], count: 0 });
    assert.equal(res.status, 422);
    const body = (await res.json()) as { details: Record<string, string> };
    assert.ok(body.details.login && body.details.keywords && body.details.count);
    const run = (await (await get("/api/run")).json()) as { status: string };
    assert.equal(run.status, "idle");
  });

  it("start: не JSON — 415, битый JSON — 400, большое тело — 413", async () => {
    assert.equal((await get("/api/run/start", { method: "POST", body: "x" })).status, 415);
    const bad = await get("/api/run/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
    assert.equal(bad.status, 400);
    const big = await get("/api/run/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x: "y".repeat(70_000) }),
    });
    assert.equal(big.status, 413);
  });

  it("stop / reset / captcha / code без прогона — понятные 409/422", async () => {
    assert.equal((await post("/api/run/stop")).status, 409);
    assert.equal((await post("/api/run/captcha", { action: "refresh" })).status, 409);
    assert.equal((await post("/api/run/captcha", { action: "solve", text: "" })).status, 422);
    assert.equal((await post("/api/run/code", { code: "123 456" })).status, 409);
    assert.equal((await post("/api/run/code", { code: "" })).status, 422);
    assert.equal((await post("/api/run/reset")).status, 200);
  });

  it("неизвестный метод — 405, неизвестный API — 404 JSON", async () => {
    assert.equal((await get("/api/run", { method: "DELETE" })).status, 405);
    const res = await get("/api/nope");
    assert.equal(res.status, 404);
    assert.equal((await res.json() as { error: string }).error, "not found");
  });

  it("SSE: первое событие — текущий снимок", async () => {
    const controller = new AbortController();
    const res = await get("/api/run/events", { signal: controller.signal });
    assert.match(res.headers.get("content-type") ?? "", /text\/event-stream/);
    const reader = res.body!.getReader();
    const { value } = await reader.read();
    controller.abort();
    const line = new TextDecoder().decode(value);
    assert.match(line, /^data: \{.*"status":"idle"/);
  });
});

describe("статика", () => {
  it("index.html — no-cache, ассеты с хешем — immutable", async () => {
    const index = await get("/");
    assert.equal(index.status, 200);
    assert.equal(index.headers.get("cache-control"), "no-cache");
    const asset = await get("/assets/app-abc123.js");
    assert.match(asset.headers.get("cache-control") ?? "", /immutable/);
    assert.match(asset.headers.get("content-type") ?? "", /javascript/);
  });

  it("неизвестный путь — SPA-фолбэк на index.html, HEAD без тела", async () => {
    const res = await get("/some/route");
    assert.match(await res.text(), /<title>OTKLIK<\/title>/);
    const head = await get("/", { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
  });

  it("выход за пределы каталога и битый URI не проходят", async () => {
    const traversal = await get("/..%2f..%2fetc%2fpasswd");
    assert.doesNotMatch(await traversal.text(), /root:/);
    assert.equal((await get("/%E0%A4%A")).status, 400);
  });
});

// новый клиент: первый запрос выдаёт cookie, дальше ходим с ним
async function newClient() {
  const res = await get("/api/run");
  const setCookie = res.headers.get("set-cookie") ?? "";
  const cookie = setCookie.split(";")[0]!;
  const id = cookie.split("=")[1]!;
  const as = (path: string, init: RequestInit = {}) => get(path, { ...init, headers: { Cookie: cookie, ...init.headers } });
  const postAs = (path: string, body?: unknown) =>
    as(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: body === undefined ? null : JSON.stringify(body) });
  return { id, cookie, setCookie, get: as, post: postAs };
}

const validStart = (login: string) => ({ login, authMode: "password", password: "x", keywords: ["React"], count: 1 });

describe("изоляция клиентов", () => {
  it("cookie: HttpOnly, SameSite=Strict, без Secure по http; с Secure за HTTPS-прокси", async () => {
    const plain = await newClient();
    assert.match(plain.setCookie, /^otklik_client=[A-Za-z0-9_-]{32,}; Path=\/; Max-Age=\d+; HttpOnly; SameSite=Strict$/);
    const behindProxy = await get("/api/run", { headers: { "X-Forwarded-Proto": "https" } });
    assert.match(behindProxy.headers.get("set-cookie") ?? "", /; Secure$/);
    const again = await plain.get("/api/run");
    assert.equal(again.headers.get("set-cookie"), null, "с cookie новый id не выдаётся");
  });

  it("чужой прогон не виден и недоступен: ни статус, ни капча, ни код, ни STOP", async () => {
    const owner = await newClient();
    const stranger = await newClient();
    const store = runs.of(owner.id);
    const signal = store.start(1, "owner@mail.ru");
    const captcha = store.solveCaptcha({ image: "data:image/png;base64,", wrong: false }, signal);
    captcha.catch(() => {});

    const mine = (await (await owner.get("/api/run")).json()) as { status: string; captcha: unknown };
    assert.equal(mine.status, "running");
    assert.ok(mine.captcha, "владелец видит свою капчу");

    const theirs = (await (await stranger.get("/api/run")).json()) as { status: string; captcha: unknown; log: unknown[] };
    assert.equal(theirs.status, "idle", "посторонний видит только свой пустой прогон");
    assert.equal(theirs.captcha, null);
    assert.equal((await stranger.post("/api/run/captcha", { action: "solve", text: "x" })).status, 409);
    assert.equal((await stranger.post("/api/run/code", { code: "123456" })).status, 409);
    assert.equal((await stranger.post("/api/run/stop")).status, 409);
    assert.equal(store.isRunning, true, "прогон владельца не остановлен");

    // живые обновления: постороннему приходит его снимок
    const controller = new AbortController();
    const sse = await stranger.get("/api/run/events", { signal: controller.signal });
    const { value } = await sse.body!.getReader().read();
    controller.abort();
    assert.match(new TextDecoder().decode(value), /"status":"idle"/);

    assert.equal((await owner.post("/api/run/stop")).status, 202, "владелец свой прогон остановить может");
    store.fail("stopped");
  });

  it("один hh-аккаунт не запускается из второго браузера", async () => {
    const first = runs.of((await newClient()).id);
    first.start(1, "Same@Mail.ru");
    const second = await newClient();
    const res = await second.post("/api/run/start", validStart("same@mail.ru"));
    assert.equal(res.status, 409);
    assert.match(((await res.json()) as { error: string }).error, /already running/);
    first.stop();
    first.fail("stopped");
  });

  it("лимит одновременных прогонов: сверх MAX_RUNS — 503", async () => {
    const a = runs.of((await newClient()).id);
    const b = runs.of((await newClient()).id);
    a.start(1, "limit-a@mail.ru");
    b.start(1, "limit-b@mail.ru");
    const third = await newClient();
    const res = await third.post("/api/run/start", validStart("limit-c@mail.ru"));
    assert.equal(res.status, 503);
    assert.match(((await res.json()) as { error: string }).error, /busy/);
    for (const s of [a, b]) {
      s.stop();
      s.fail("stopped");
    }
  });
});
