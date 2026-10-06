import "./helpers/env.js";
import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { chromium, type Browser } from "playwright";
import { login } from "../src/hh-bot/bot.service.js";
import { loadSession } from "../src/hh-bot/bot.session.js";
import { BotError, type CaptchaSolver } from "../src/hh-bot/bot.types.js";
import { codePage, mockHh, passwordPage, type CodeWidget } from "./helpers/hh-mock.js";

let browser: Browser;
before(async () => {
  browser = await chromium.launch({ headless: true });
});
after(() => browser.close());

const signal = new AbortController().signal;

async function run(html: string, account: Parameters<typeof login>[2], options: Parameters<typeof login>[3]) {
  const ctx = await browser.newContext();
  await mockHh(ctx, html);
  const page = await ctx.newPage();
  try {
    await login(page, ctx, account, options);
    return page.url();
  } finally {
    await ctx.close();
  }
}

const password = (login: string, pass: string) =>
  ({ login, authMode: "password", password: pass, sessionSecret: pass }) as const;
const autoCaptcha: CaptchaSolver = async () => ({ action: "solve", text: "ok" });

describe("вход по паролю", () => {
  it("успех: уходит со страницы входа и сохраняет сессию под паролем", async () => {
    const url = await run(passwordPage({ password: "right" }), password("pw-ok@mail.ru", "right"), {});
    assert.equal(url, "https://hh.ru/");
    assert.ok(await loadSession({ login: "pw-ok@mail.ru", secret: "right" }));
    assert.equal(await loadSession({ login: "pw-ok@mail.ru", secret: "wrong" }), null);
  });

  it("неверный пароль: bad_credentials с текстом hh", async () => {
    await assert.rejects(
      run(passwordPage({ password: "right" }), password("pw-bad@mail.ru", "wrong"), {}),
      (e: unknown) => e instanceof BotError && e.code === "bad_credentials" && /Неверный email или пароль/.test(e.message),
    );
  });

  it("капча после отправки: уходит человеку, после ответа вход завершается", async () => {
    const asked: boolean[] = [];
    const url = await run(passwordPage({ password: "right", captcha: "once" }), password("pw-cap@mail.ru", "right"), {
      captcha: {
        signal,
        solver: async (req) => {
          asked.push(req.wrong);
          assert.match(req.image, /^data:image\/png;base64,/);
          return asked.length === 1 ? { action: "refresh" } : { action: "solve", text: "ok" };
        },
      },
    });
    assert.equal(url, "https://hh.ru/");
    assert.deepEqual(asked, [false, false], "после «обновить» картинка не помечается как неверный ответ");
  });

  it("бесконечная капча: после 3 штук — bad_credentials, а не вечный цикл", async () => {
    let n = 0;
    await assert.rejects(
      run(passwordPage({ password: "right", captcha: "endless" }), password("pw-loop@mail.ru", "right"), {
        captcha: { signal, solver: async () => (n++, { action: "solve", text: "ok" }) },
      }),
      (e: unknown) => e instanceof BotError && e.code === "bad_credentials",
    );
    assert.equal(n, 3);
  });
});

describe("вход по коду из почты", () => {
  const cases: [CodeWidget, string[]][] = [
    ["rerender", ["123456"]],
    ["rerender", ["111111", "222222", "123456"]],
    ["keys", ["111111", "123456"]],
    ["single-hide", ["999999", "123 456".replace(" ", "")]],
    ["stale", ["111111", "123456"]],
  ];

  for (const [widget, codes] of cases) {
    it(`${widget}: ${codes.length - 1} неверных → верный`, { timeout: 60_000 }, async () => {
      const asked: string[] = [];
      const key = "k".repeat(43);
      const url = await run(
        codePage(widget),
        { login: `code-${widget}@mail.ru`, authMode: "code", password: "", sessionSecret: key },
        {
          captcha: { signal, solver: autoCaptcha },
          code: {
            signal,
            solver: async (req) => {
              asked.push(`${req.attempt}:${req.wrong ? "wrong" : "fresh"}`);
              return codes[req.attempt] ?? "000000";
            },
          },
        },
      );
      assert.equal(url, "https://hh.ru/");
      assert.deepEqual(
        asked,
        codes.map((_, i) => `${i}:${i === 0 ? "fresh" : "wrong"}`),
      );
      assert.ok(await loadSession({ login: `code-${widget}@mail.ru`, secret: key }), "сессия под ключом устройства");
    });
  }

  it("верный код с автоотправкой: вход быстрее 5 с (без 30-секундных ожиданий)", async () => {
    let codeAt = 0;
    await run(
      codePage("rerender"),
      { login: "code-fast@mail.ru", authMode: "code", password: "", sessionSecret: "k".repeat(43) },
      { code: { signal, solver: async () => ((codeAt = Date.now()), "123456") } },
    );
    assert.ok(Date.now() - codeAt < 5_000, `${Date.now() - codeAt} мс`);
  });

  it("5 неверных кодов подряд — bad_credentials", { timeout: 90_000 }, async () => {
    await assert.rejects(
      run(
        codePage("rerender"),
        { login: "code-bad@mail.ru", authMode: "code", password: "", sessionSecret: "k".repeat(43) },
        { code: { signal, solver: async () => "000000" } },
      ),
      (e: unknown) => e instanceof BotError && e.code === "bad_credentials",
    );
  });
});
