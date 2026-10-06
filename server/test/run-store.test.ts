import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { RunStore } from "../src/shared/run/run.store.js";

const progress = { sent: 0, skipped: 0, failed: 0 };
const captcha = { image: "data:image/png;base64,", wrong: false };

describe("RunStore", () => {
  let runStore: RunStore;
  beforeEach(() => {
    runStore = new RunStore();
  });

  it("версия растёт с каждым изменением, в том числе через reset", () => {
    const v0 = runStore.snapshot.version;
    runStore.start(3, "a@b.c");
    runStore.log("x");
    runStore.finish(progress);
    runStore.reset();
    assert.ok(runStore.snapshot.version >= v0 + 4);
  });

  it("второй прогон не стартует, reset во время прогона запрещён", () => {
    runStore.start(3, "a@b.c");
    assert.equal(runStore.isRunning, true);
    assert.equal(runStore.reset(), false);
  });

  it("капча: вопрос в снимке, ответ доходит до бота и снимает вопрос", async () => {
    const signal = runStore.start(1, "a@b.c");
    const answer = runStore.solveCaptcha(captcha, signal);
    assert.deepEqual(runStore.snapshot.captcha, captcha);
    assert.equal(runStore.answerCaptcha({ action: "solve", text: "abc" }), true);
    assert.deepEqual(await answer, { action: "solve", text: "abc" });
    assert.equal(runStore.snapshot.captcha, null);
    assert.equal(runStore.answerCaptcha({ action: "refresh" }), false, "второй ответ некуда отдать");
  });

  it("код из письма: тот же механизм", async () => {
    const signal = runStore.start(1, "a@b.c");
    const code = runStore.enterCode({ email: "a@b.c", wrong: false, attempt: 0 }, signal);
    assert.equal(runStore.snapshot.code?.email, "a@b.c");
    runStore.answerCode("123456");
    assert.equal(await code, "123456");
    assert.equal(runStore.snapshot.code, null);
  });

  it("STOP во время ожидания капчи: ожидание прерывается, итог — stopped", async () => {
    const signal = runStore.start(1, "a@b.c");
    const answer = runStore.solveCaptcha(captcha, signal);
    runStore.stop();
    await assert.rejects(answer);
    runStore.fail("aborted");
    assert.equal(runStore.snapshot.status, "stopped");
    assert.equal(runStore.snapshot.captcha, null);
  });

  it("ошибка бота с кодом попадает в снимок", () => {
    runStore.start(1, "a@b.c");
    runStore.fail("hh.ru: Неверный пароль", "bad_credentials");
    assert.equal(runStore.snapshot.status, "error");
    assert.equal(runStore.snapshot.errorCode, "bad_credentials");
  });

  it("finish: все отправлены / выдача кончилась", () => {
    runStore.start(2, "a@b.c");
    runStore.finish({ sent: 2, skipped: 0, failed: 0 });
    assert.equal(runStore.snapshot.note, "all applications sent");
    runStore.reset();
    runStore.start(5, "a@b.c");
    runStore.finish({ sent: 1, skipped: 0, failed: 0 });
    assert.equal(runStore.snapshot.note, "no more matching vacancies");
  });
});

describe("RunRegistry", () => {
  it("у каждого клиента свой прогон", async () => {
    const { runs } = await import("../src/shared/run/run.registry.js");
    const a = runs.of("client-a-".padEnd(32, "x"));
    const b = runs.of("client-b-".padEnd(32, "x"));
    assert.notEqual(a, b);
    assert.equal(runs.of("client-a-".padEnd(32, "x")), a, "тот же клиент — тот же прогон");
    a.start(1, " Alice@Mail.ru ");
    assert.equal(b.isRunning, false);
    assert.equal(runs.runningCount, 1);
    assert.equal(runs.isLoginRunning("alice@mail.ru"), true, "логин без учёта регистра");
    assert.equal(runs.isLoginRunning("bob@mail.ru"), false);
    runs.stopAll();
    a.fail("stopped");
    assert.equal(runs.runningCount, 0);
    assert.equal(runs.isLoginRunning("alice@mail.ru"), false);
  });

  it("уборка: забывает старые завершённые прогоны без вкладок, но не идущие", async () => {
    const { runs } = await import("../src/shared/run/run.registry.js");
    const idle = runs.of("sweep-idle".padEnd(32, "x"));
    const watched = runs.of("sweep-watched".padEnd(32, "x"));
    const running = runs.of("sweep-running".padEnd(32, "x"));
    const unsubscribe = watched.subscribe(() => {});
    running.start(1, "sweep@mail.ru");
    runs.sweep(Date.now() + 25 * 60 * 60 * 1000);
    assert.notEqual(runs.of("sweep-idle".padEnd(32, "x")), idle, "завершённый без вкладок — забыт");
    assert.equal(runs.of("sweep-watched".padEnd(32, "x")), watched, "с открытой вкладкой — остался");
    assert.equal(runs.of("sweep-running".padEnd(32, "x")), running, "идущий — остался");
    unsubscribe();
    running.stop();
    running.fail("stopped");
  });
});
