import { testRoot } from "./helpers/env.js";
import assert from "node:assert/strict";
import { copyFileSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { describe, it } from "node:test";
import type { BrowserContext } from "playwright";
import { deleteSession, loadSession, saveSession, sessionFile } from "../src/hh-bot/bot.session.js";

const COOKIE = "SECRET-COOKIE-VALUE";
// saveSession берёт у контекста только storageState
const ctx = {
  storageState: async () => ({
    cookies: [{ name: "hhtoken", value: COOKIE, domain: ".hh.ru", path: "/", expires: -1, httpOnly: true, secure: true, sameSite: "Lax" }],
    origins: [],
  }),
} as unknown as BrowserContext;

describe("зашифрованные сессии", () => {
  it(`файл не содержит cookies открытым текстом и закрыт правами (${testRoot})`, async () => {
    const path = await saveSession(ctx, { login: "alice@mail.ru", secret: "right" });
    assert.ok(!readFileSync(path, "utf8").includes(COOKIE));
    assert.equal(statSync(path).mode & 0o777, 0o600);
  });

  it("открывается тем же секретом, логин без учёта регистра и пробелов", async () => {
    await saveSession(ctx, { login: "alice@mail.ru", secret: "right" });
    const state = await loadSession({ login: " ALICE@mail.ru ", secret: "right" });
    assert.equal(state?.cookies[0]?.value, COOKIE);
  });

  it("неверный секрет — null, и файл не удаляется", async () => {
    await saveSession(ctx, { login: "alice@mail.ru", secret: "right" });
    assert.equal(await loadSession({ login: "alice@mail.ru", secret: "guess" }), null);
    assert.ok(statSync(sessionFile("alice@mail.ru")).isFile());
  });

  it("файл одного логина не открывается под другим (AAD)", async () => {
    await saveSession(ctx, { login: "alice@mail.ru", secret: "right" });
    copyFileSync(sessionFile("alice@mail.ru"), sessionFile("bob@mail.ru"));
    assert.equal(await loadSession({ login: "bob@mail.ru", secret: "right" }), null);
  });

  it("испорченный файл — null", async () => {
    await saveSession(ctx, { login: "carol@mail.ru", secret: "right" });
    const path = sessionFile("carol@mail.ru");
    const file = JSON.parse(readFileSync(path, "utf8"));
    file.data = (file.data[0] === "A" ? "B" : "A") + file.data.slice(1);
    writeFileSync(path, JSON.stringify(file));
    assert.equal(await loadSession({ login: "carol@mail.ru", secret: "right" }), null);
  });

  it("deleteSession удаляет файл, отсутствие файла — null", async () => {
    await saveSession(ctx, { login: "dave@mail.ru", secret: "right" });
    await deleteSession("dave@mail.ru");
    assert.equal(await loadSession({ login: "dave@mail.ru", secret: "right" }), null);
    await deleteSession("dave@mail.ru"); // повторно — без ошибки
  });
});
