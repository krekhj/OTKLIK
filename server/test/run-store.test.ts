import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { runStore } from "../src/shared/run/run.store.js";

const progress = { sent: 0, skipped: 0, failed: 0 };
const captcha = { image: "data:image/png;base64,", wrong: false };

describe("runStore", () => {
  beforeEach(() => {
    if (runStore.isRunning) {
      runStore.stop();
      runStore.fail("cleanup");
    }
    runStore.reset();
  });

  it("версия растёт с каждым изменением, в том числе через reset", () => {
    const v0 = runStore.snapshot.version;
    runStore.start(3);
    runStore.log("x");
    runStore.finish(progress);
    runStore.reset();
    assert.ok(runStore.snapshot.version >= v0 + 4);
  });

  it("второй прогон не стартует, reset во время прогона запрещён", () => {
    runStore.start(3);
    assert.equal(runStore.isRunning, true);
    assert.equal(runStore.reset(), false);
  });

  it("капча: вопрос в снимке, ответ доходит до бота и снимает вопрос", async () => {
    const signal = runStore.start(1);
    const answer = runStore.solveCaptcha(captcha, signal);
    assert.deepEqual(runStore.snapshot.captcha, captcha);
    assert.equal(runStore.answerCaptcha({ action: "solve", text: "abc" }), true);
    assert.deepEqual(await answer, { action: "solve", text: "abc" });
    assert.equal(runStore.snapshot.captcha, null);
    assert.equal(runStore.answerCaptcha({ action: "refresh" }), false, "второй ответ некуда отдать");
  });

  it("код из письма: тот же механизм", async () => {
    const signal = runStore.start(1);
    const code = runStore.enterCode({ email: "a@b.c", wrong: false, attempt: 0 }, signal);
    assert.equal(runStore.snapshot.code?.email, "a@b.c");
    runStore.answerCode("123456");
    assert.equal(await code, "123456");
    assert.equal(runStore.snapshot.code, null);
  });

  it("STOP во время ожидания капчи: ожидание прерывается, итог — stopped", async () => {
    const signal = runStore.start(1);
    const answer = runStore.solveCaptcha(captcha, signal);
    runStore.stop();
    await assert.rejects(answer);
    runStore.fail("aborted");
    assert.equal(runStore.snapshot.status, "stopped");
    assert.equal(runStore.snapshot.captcha, null);
  });

  it("ошибка бота с кодом попадает в снимок", () => {
    runStore.start(1);
    runStore.fail("hh.ru: Неверный пароль", "bad_credentials");
    assert.equal(runStore.snapshot.status, "error");
    assert.equal(runStore.snapshot.errorCode, "bad_credentials");
  });

  it("finish: все отправлены / выдача кончилась", () => {
    runStore.start(2);
    runStore.finish({ sent: 2, skipped: 0, failed: 0 });
    assert.equal(runStore.snapshot.note, "all applications sent");
    runStore.reset();
    runStore.start(5);
    runStore.finish({ sent: 1, skipped: 0, failed: 0 });
    assert.equal(runStore.snapshot.note, "no more matching vacancies");
  });
});
