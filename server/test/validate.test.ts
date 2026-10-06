import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateStartRun } from "../src/features/start-run/start-run.validate.js";
import { DEFAULT_COVER_LETTER } from "../src/hh-bot/bot.constants.js";

const base = { login: " Me@Mail.ru ", authMode: "password", password: " p a s s ", keywords: ["React"], count: 5 };

function errorsOf(body: unknown): Record<string, string> {
  try {
    validateStartRun(body);
  } catch (e) {
    return (e as { details: Record<string, string> }).details;
  }
  assert.fail("expected validation error");
}

describe("validateStartRun", () => {
  it("принимает минимальный запрос и подставляет значения по умолчанию", () => {
    const run = validateStartRun(base);
    assert.equal(run.login, "Me@Mail.ru");
    assert.equal(run.password, " p a s s ", "пароль не тримится");
    assert.equal(run.sessionSecret, run.password);
    assert.equal(run.coverLetter, DEFAULT_COVER_LETTER);
    assert.deepEqual(run.filters.experience, ["noExperience", "between1And3"], "без фильтров — прежний опыт");
  });

  it("собирает все ошибки сразу", () => {
    const errors = errorsOf({ authMode: "password", keywords: [], count: 0 });
    assert.deepEqual(Object.keys(errors).sort(), ["count", "keywords", "login", "password"]);
  });

  it("дедуплицирует ключевые слова и ограничивает их число", () => {
    assert.deepEqual(validateStartRun({ ...base, keywords: ["a", " a ", "", "b"] }).keywords, ["a", "b"]);
    assert.ok(errorsOf({ ...base, keywords: Array.from({ length: 11 }, (_, i) => `k${i}`) }).keywords);
  });

  it("count — целое от 1 до 200", () => {
    for (const count of [0, 201, 2.5, "5"]) assert.ok(errorsOf({ ...base, count }).count, String(count));
  });

  it("режим code: пароль не нужен, нужен ключ устройства", () => {
    const deviceKey = "a".repeat(43);
    const run = validateStartRun({ ...base, authMode: "code", password: "", deviceKey });
    assert.equal(run.password, "");
    assert.equal(run.sessionSecret, deviceKey);
    assert.ok(errorsOf({ ...base, authMode: "code", deviceKey: "short" }).login);
    assert.ok(errorsOf({ ...base, authMode: "code", deviceKey: "b".repeat(40) + "!!!" }).login);
  });

  it("режим code не принимает пароль, даже если его прислали", () => {
    const run = validateStartRun({ ...base, authMode: "code", password: "leak", deviceKey: "a".repeat(43) });
    assert.equal(run.password, "");
  });

  it("фильтры: только известные hh значения, без повторов", () => {
    const run = validateStartRun({
      ...base,
      filters: {
        area: "999",
        experience: ["moreThan6", "x", "moreThan6"],
        workFormat: ["REMOTE", "remote"],
        labels: ["not_from_agency", "<script>"],
        searchFields: ["name"],
        salary: 0,
        excludedText: "  senior ",
      },
    });
    assert.equal(run.filters.area, null);
    assert.deepEqual(run.filters.experience, ["moreThan6"]);
    assert.deepEqual(run.filters.workFormat, ["REMOTE"]);
    assert.deepEqual(run.filters.labels, ["not_from_agency"]);
    assert.equal(run.filters.salary, null, "0 — без фильтра по доходу");
    assert.equal(run.filters.excludedText, "senior");
  });

  it("фильтры: доход и слова-исключения ограничены", () => {
    const errors = errorsOf({ ...base, filters: { salary: 10_000_001, excludedText: "x".repeat(201) } });
    assert.ok(errors.salary);
    assert.ok(errors.excludedText);
    assert.ok(errorsOf({ ...base, filters: { salary: -1 } }).salary);
  });
});
